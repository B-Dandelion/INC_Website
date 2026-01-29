// lib/resourcesDb.ts
import { createSupabaseServerClient } from "./supabaseServer";

type PageArgs = { slug: string; page: number; pageSize: number; q?: string };

export async function fetchResourcesByCategoryPage({ slug, page, pageSize, q }: PageArgs) {
  const supabase = createSupabaseServerClient();

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("resources")
    .select(
      `
      id, title, displayname, published_at, created_at, r2_key, visibility,
      boards!inner ( slug, title )
    `,
      { count: "exact" }
    )
    .eq("visibility", "public")
    .eq("boards.slug", slug)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (q && q.trim()) query = query.ilike("title", `%${q.trim()}%`);

  const { data, count, error } = await query.range(from, to);
  if (error) throw error;

  return {
    items: (data ?? []).map((r: any) => ({
      id: String(r.id),
      title: r.displayname || r.title,
      date: String(r.published_at ?? r.created_at).slice(0, 10),
      // ResourceBoard가 요구하는 href를 만들어 줌
      href: r.r2_key ? `/api/resources/download?key=${encodeURIComponent(r.r2_key)}` : "#",
    })),
    total: count ?? 0,
  };
}

export type DbResource = {
  id: number;
  board_id: number;
  title: string;
  displayname: string | null;
  kind: string;
  published_at: string | null;
  created_at: string;
  visibility: "public" | "member" | "admin";
  r2_key: string | null;
  mime: string | null;
  size_bytes: number | null;
  created_by: string | null;
  boards?: { slug: string; title: string } | null;
};

async function getBoardIdBySlug(slug: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("boards")
    .select("id")
    .eq("slug", slug)
    .maybeSingle<{ id: number }>();

  if (error || !data) return null;
  return data.id;
}

// ✅ 홈에서 쓰는 export 다시 복구
export async function fetchPublicResources(arg: number | { limit?: number; boardSlug?: string } = 50) {
  const supabase = createSupabaseServerClient();
  const opts = typeof arg === "number" ? { limit: arg } : arg;

  const limit = opts.limit ?? 50;
  const boardSlug = (opts.boardSlug ?? "").trim();

  let q = supabase
    .from("resources")
    .select(
      `
      id, board_id, title, displayname, kind, published_at, visibility, r2_key, created_at,
      mime, size_bytes, created_by,
      boards:boards ( slug, title )
    `
    )
    .eq("visibility", "public");

  if (boardSlug) {
    const boardId = await getBoardIdBySlug(boardSlug);
    if (boardId == null) return [];
    q = q.eq("board_id", boardId);
  }

  const { data, error } = await q
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<DbResource[]>();

  if (error) return [];
  return data ?? [];
}
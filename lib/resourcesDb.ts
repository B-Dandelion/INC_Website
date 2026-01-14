// lib/resourcesDb.ts
import { createSupabaseServerClient } from "./supabaseServer";

export type DbResource = {
  id: number;
  board_id: number;                // 이제 null 안 쓰는 방향이면 number로 고정 권장
  title: string;
  kind: string;
  note: string;                    // null 허용 안 할 거면 text ''로 저장하게 하고 string으로
  published_at: string;            // null 허용 안 할 거면 date 필수로
  created_at: string;
  visibility: "public" | "member" | "admin";
  r2_key: string | null;

  // boards join 결과
  boards: { slug: string; title: string } | null;
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

export async function fetchPublicResources(
  arg: number | { limit?: number; boardSlug?: string } = 50,
) {
  const supabase = createSupabaseServerClient();
  const opts = typeof arg === "number" ? { limit: arg } : arg;

  const limit = opts.limit ?? 50;
  const boardSlug = (opts.boardSlug ?? "").trim();

  let q = supabase
    .from("resources")
    .select(`
      id, board_id, title, kind, note, published_at, visibility, r2_key, created_at,
      boards:boards ( slug, title )
    `)
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
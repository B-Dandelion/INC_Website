// lib/resourcesDb.ts
import { createSupabaseServerClient } from "./supabaseServer";

export type DbResource = {
  id: number;
  board_id: number | null;
  title: string;
  kind: string;
  note: string | null;
  published_at: string | null;
  created_at: string;
  visibility: "public" | "member" | "admin";
  r2_key: string | null;
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
    .select("id, board_id, title, kind, note, published_at, visibility, r2_key, created_at")
    .eq("visibility", "public");

  if (boardSlug) {
    const boardId = await getBoardIdBySlug(boardSlug);
    if (boardId == null) return []; // slug가 없으면 빈 결과
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
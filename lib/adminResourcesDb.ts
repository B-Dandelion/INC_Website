import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export type AdminFetchResourcesArgs = {
  boardSlug: string;
  page?: number;
  pageSize?: number;
};

export async function fetchAdminResources({
  boardSlug,
  page = 1,
  pageSize = 50,
}: AdminFetchResourcesArgs) {
  const normalizedPage = Math.max(1, page);
  const normalizedPageSize = Math.min(100, Math.max(10, pageSize));
  const from = (normalizedPage - 1) * normalizedPageSize;
  const to = from + normalizedPageSize - 1;

  const { data: board, error: boardError } = await sb
    .from("boards")
    .select("id")
    .eq("slug", boardSlug)
    .maybeSingle();

  if (boardError) throw new Error(boardError.message);
  if (!board) return [];

  const isIssue =
    boardSlug === "atm" || boardSlug === "heartbeat-of-atoms";
  const orderField = isIssue ? "published_at" : "posted_at";

  const { data, error } = await sb
    .from("resources")
    .select(
      "id,title,kind,posted_at,published_at,r2_key,original_filename,source_path,note,views_count,created_at,visibility,mime,size_bytes,deleted_at"
    )
    .eq("board_id", board.id)
    .is("deleted_at", null)
    .order(orderField, { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);
  return data ?? [];
}

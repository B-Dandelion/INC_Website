import { createClient } from "@supabase/supabase-js";
import { ISSUE_BOARD_SLUGS, RESOURCE_KINDS, VISIBILITIES } from "@/lib/resourceFilters";

const sb = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export type AdminResourceRow = {
  id: number;
  title: string | null;
  kind: string | null;
  posted_at: string | null;
  published_at: string | null;
  r2_key: string | null;
  original_filename: string | null;
  source_path: string | null;
  note: string | null;
  views_count: number | null;
  created_at: string;
  visibility: "public" | "member" | "admin";
  mime: string | null;
  size_bytes: number | null;
  deleted_at: string | null;
};


export type AdminFetchResourcesArgs = {
  boardSlug: string;
  page?: number;
  pageSize?: number;
  q?: string;
  visibility?: string;
  kind?: string;
};


// PostgREST `or` filters are comma/paren separated, so strip those characters
// (and LIKE wildcards) from the search text instead of trying to escape them.
function searchTerm(q: string) {
  return q.replace(/[,()%*\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export async function fetchAdminResources({
  boardSlug,
  page = 1,
  pageSize = 50,
  q = "",
  visibility,
  kind,
}: AdminFetchResourcesArgs): Promise<{ rows: AdminResourceRow[]; total: number }> {
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
  if (!board) return { rows: [], total: 0 };

  const orderField = ISSUE_BOARD_SLUGS.has(boardSlug) ? "published_at" : "posted_at";

  let query = sb
    .from("resources")
    .select(
      "id,title,kind,posted_at,published_at,r2_key,original_filename,source_path,note,views_count,created_at,visibility,mime,size_bytes,deleted_at",
      { count: "exact" },
    )
    .eq("board_id", board.id)
    .is("deleted_at", null);

  const term = searchTerm(q);
  if (term) {
    query = query.or(`title.ilike.%${term}%,original_filename.ilike.%${term}%,note.ilike.%${term}%`);
  }
  if (visibility && (VISIBILITIES as readonly string[]).includes(visibility)) {
    query = query.eq("visibility", visibility);
  }
  if (kind && (RESOURCE_KINDS as readonly string[]).includes(kind)) {
    query = query.eq("kind", kind);
  }

  const { data, error, count } = await query
    .order(orderField, { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .range(from, to)
    .returns<AdminResourceRow[]>();

  if (error) throw new Error(error.message);
  return { rows: data ?? [], total: count ?? 0 };
}

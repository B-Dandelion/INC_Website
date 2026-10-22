// lib/resourcesDb.ts
import { createSupabaseServerClient } from "./supabaseServer";
import { CACHE_TAGS, cachedPublicQuery } from "./publicCache";
import { supabaseAnon } from "./supabaseServer";

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

async function getBoardIdBySlugUncached(slug: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("boards")
    .select("id")
    .eq("slug", slug)
    .maybeSingle<{ id: number }>();

  if (error || !data) return null;
  return data.id;
}

async function fetchPublicResourcesUncached(
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
    .eq("visibility", "public")
    .is("deleted_at", null);

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

export type BoardRow = {
  id: number;
  slug: string;
  title: string;
  sort_order: number;
};

type BoardMini = { slug: string; title: string };

export type ResourceRow = {
  id: number;
  title: string;
  kind: string;
  posted_at: string;
  published_at: string; // date
  r2_key: string;
  original_filename: string;
  source_path: string | null;
  note: string | null;
  views_count: number | null;
  created_at: string;
  size_bytes?: number | null;
  boards: BoardMini | null; // 화면에서는 단일로
};

function normalizeBoard(
  b: BoardMini | BoardMini[] | null | undefined
): BoardMini | null {
  if (!b) return null;
  return Array.isArray(b) ? (b[0] ?? null) : b;
}

async function fetchBoardsUncached(): Promise<BoardRow[]> {
  const sb = supabaseAnon();
  const { data, error } = await sb
    .from("boards")
    .select("id,slug,title,sort_order")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as BoardRow[];
}

type FetchResourcesArgs = {
  boardSlug?: string;       // 없으면 전체
  path?: string;            // source_path 필터(하위카테고리)
  q?: string;               // title 검색
  page?: number;            // 1-based
  pageSize?: number;

  publishedFrom?: string; // YYYY-MM-DD
  publishedTo?: string;   // YYYY-MM-DD
};

// fetchResources 수정
// lib/resourcesDb.ts

async function fetchResourcesUncached(args: FetchResourcesArgs) {
  const sb = supabaseAnon();
  const page = Math.max(1, args.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, args.pageSize ?? 30));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // 리스트 정렬 기준:
  // - ATM/Heartbeat: 발간일(published_at)
  // - 나머지: 게시일(posted_at)
  const slug = (args.boardSlug ?? "").trim();
  const isIssueBoard = slug === "atm" || slug === "heartbeat-of-atoms";
  const orderField = isIssueBoard ? "published_at" : "posted_at";

  // ATM/Heartbeat: "이후" 검색(publishedFrom 있음, publishedTo 없음)일 때는 오름차순
  const issueAfterMode = isIssueBoard && !!args.publishedFrom && !args.publishedTo;
  const primaryAscending = issueAfterMode ? true : false;

  let q = sb
    .from("resources")
    .select(
      "id,title,kind,posted_at,published_at,r2_key,original_filename,source_path,note,views_count,created_at,size_bytes,boards:boards(slug,title)"
    )
    .is("deleted_at", null)
    .eq("visibility", "public")
    .order(orderField, { ascending: primaryAscending })
    .order("id", { ascending: false })
    .range(from, to);

  if (args.boardSlug) {
    const boardId = await getBoardIdBySlugAnon(args.boardSlug);
    if (!boardId) return [];
    q = q.eq("board_id", boardId);
  }

  if (args.q) q = q.or(`title.ilike.%${args.q}%,note.ilike.%${args.q}%`);

  if (isIssueBoard) {
    if (args.publishedFrom) q = q.gte("published_at", args.publishedFrom);
    if (args.publishedTo) q = q.lte("published_at", args.publishedTo);
  }
  if (args.path) q = q.eq("source_path", args.path);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  type RawResourceRow = Omit<ResourceRow, "boards"> & { boards: BoardMini | BoardMini[] | null };
  const rows = ((data ?? []) as unknown as RawResourceRow[]).map((r) => ({
    ...r,
    boards: normalizeBoard(r.boards),
  }));

  return rows as ResourceRow[];
}


async function getBoardIdBySlugAnonUncached(slug: string): Promise<number | null> {
  const sb = supabaseAnon();
  const { data, error } = await sb
    .from("boards")
    .select("id")
    .eq("slug", slug)
    .maybeSingle<{ id: number }>();

  if (error || !data) return null;
  return data.id;
}

// Cached public queries (see lib/publicCache.ts).
const getBoardIdBySlug = cachedPublicQuery(getBoardIdBySlugUncached, "resourcesDb:getBoardIdBySlug", [CACHE_TAGS.boards]);
export const fetchPublicResources = cachedPublicQuery(fetchPublicResourcesUncached, "resourcesDb:fetchPublicResources", [CACHE_TAGS.resources, CACHE_TAGS.boards]);
export const fetchBoards = cachedPublicQuery(fetchBoardsUncached, "resourcesDb:fetchBoards", [CACHE_TAGS.boards]);
export const fetchResources = cachedPublicQuery(fetchResourcesUncached, "resourcesDb:fetchResources", [CACHE_TAGS.resources, CACHE_TAGS.boards]);
const getBoardIdBySlugAnon = cachedPublicQuery(getBoardIdBySlugAnonUncached, "resourcesDb:getBoardIdBySlugAnon", [CACHE_TAGS.boards]);

// Total rows for the same filters as fetchResources, for numbered pagination.
async function countResourcesUncached(args: FetchResourcesArgs): Promise<number> {
  const sb = supabaseAnon();
  const slug = (args.boardSlug ?? "").trim();
  const isIssueBoard = slug === "atm" || slug === "heartbeat-of-atoms";
  let q = sb.from("resources").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("visibility", "public");
  if (args.boardSlug) {
    const boardId = await getBoardIdBySlugAnon(args.boardSlug);
    if (!boardId) return 0;
    q = q.eq("board_id", boardId);
  }
  if (args.q) q = q.or(`title.ilike.%${args.q}%,note.ilike.%${args.q}%`);
  if (isIssueBoard) {
    if (args.publishedFrom) q = q.gte("published_at", args.publishedFrom);
    if (args.publishedTo) q = q.lte("published_at", args.publishedTo);
  }
  if (args.path) q = q.eq("source_path", args.path);
  const { count, error } = await q;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export const countResources = cachedPublicQuery(countResourcesUncached, "resourcesDb:countResources", [CACHE_TAGS.resources, CACHE_TAGS.boards]);

// lib/resourcesDb.ts
import { createSupabaseServerClient } from "./supabaseServer";
import { supabaseAnon } from "./supabaseServer";

export type SimpleResourceRow = {
  id: number;
  title: string | null;
  original_filename: string | null;
  source_path: string | null;
};

export async function fetchResourcesByPrefix(prefix: string): Promise<SimpleResourceRow[]> {
  const supabase = createSupabaseServerClient();

  const like = prefix.endsWith("/") ? `${prefix}%` : `${prefix}/%`;

  const { data, error } = await supabase
    .from("resources")
    .select("id, title, original_filename, source_path")
    .ilike("source_path", like)
    .order("source_path", { ascending: true });

  if (error) throw error;
  return (data ?? []) as SimpleResourceRow[];
}

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
  boards: BoardMini | null; // 화면에서는 단일로
};

function normalizeBoard(
  b: BoardMini | BoardMini[] | null | undefined
): BoardMini | null {
  if (!b) return null;
  return Array.isArray(b) ? (b[0] ?? null) : b;
}


const NESTED_BOARDS = new Set(["contribution", "seminar", "workshop"]);

export function isNestedBoard(slug: string) {
  return NESTED_BOARDS.has(slug);
}

export async function fetchBoards(): Promise<BoardRow[]> {
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

export async function fetchResources(args: FetchResourcesArgs) {
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

  let q = sb
    .from("resources")
    .select(
      "id,title,kind,posted_at,published_at,r2_key,original_filename,source_path,note,views_count,created_at,boards:boards(slug,title)"
    )
    .is("deleted_at", null)
    .eq("visibility", "public")
    .order(orderField, { ascending: false })
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

  const rows = (data ?? []).map((r: any) => ({
    ...r,
    boards: normalizeBoard(r.boards),
  }));

  return rows as ResourceRow[];
}


export async function fetchSourcePaths(boardSlug: string): Promise<string[]> {
  if (!isNestedBoard(boardSlug)) return [];

  const boardId = await getBoardIdBySlugAnon(boardSlug);
  if (!boardId) return [];

  const sb = supabaseAnon();
  const { data, error } = await sb
    .from("resources")
    .select("source_path")
    .is("deleted_at", null)
    .eq("visibility", "public")
    .eq("board_id", boardId)
    .not("source_path", "is", null);

  if (error) throw new Error(error.message);

  const set = new Set<string>();
  for (const row of data ?? []) {
    const sp = (row as any).source_path as string | null;
    if (!sp) continue;
    set.add(sp);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function buildSourcePathTree(boardSlug: string, sourcePaths: string[]) {
  // source_path: "seminar/국내세미나/...." 형태
  // 좌측에서는 boardSlug 다음부터 트리로 표시
  type Node = { name: string; fullPath?: string; children: Map<string, Node> };

  const root: Node = { name: boardSlug, children: new Map() };

  for (const sp of sourcePaths) {
    const normalized = sp.replaceAll("\\", "/");
    const parts = normalized.split("/").filter(Boolean);
    if (parts[0] !== boardSlug) continue;

    // "boardSlug" 이후 폴더들만 트리 노드로
    const rest = parts.slice(1);
    let cur = root;

    for (let i = 0; i < rest.length; i++) {
      const seg = rest[i];
      let child = cur.children.get(seg);
      if (!child) {
        child = { name: seg, children: new Map() };
        cur.children.set(seg, child);
      }
      cur = child;

      // “하위 카테고리”는 폴더 단위로 클릭하게(leaf가 아니라도 클릭 가능)
      // fullPath는 여기까지의 경로
      const full = [boardSlug, ...rest.slice(0, i + 1)].join("/");
      cur.fullPath = full;
    }
  }

  return root;
}

async function getBoardIdBySlugAnon(slug: string): Promise<number | null> {
  const sb = supabaseAnon();
  const { data, error } = await sb
    .from("boards")
    .select("id")
    .eq("slug", slug)
    .maybeSingle<{ id: number }>();

  if (error || !data) return null;
  return data.id;
}
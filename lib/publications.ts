// lib/publications.ts
// Web pages for the two serial publications (ATM, Heartbeat of Atoms): load an
// issue, read its PDF text once, and cache the parsed result. Only public,
// non-deleted issues are served, so member-only files never become page text.
import { unstable_cache } from "next/cache";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getDocumentProxy } from "unpdf";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { CACHE_TAGS } from "@/lib/publicCache";
import { parseAtm, parseHeartbeat, type AtmIssue, type HeartbeatIssue } from "@/lib/publicationParse";

export const PUBLICATIONS = {
  atm: {
    slug: "atm",
    name: "ATM",
    tagline: "Daily Nuclear News · At The Metro station",
    taglineKo: "평일 매일, 국내외 원자력 뉴스 3건 요약",
  },
  "heartbeat-of-atoms": {
    slug: "heartbeat-of-atoms",
    name: "Heartbeat of Atoms",
    tagline: "KINGS Biweekly Report on Global Trends in the Nuclear Industry",
    taglineKo: "원자력산업 글로벌 동향 격주 리포트",
  },
} as const;

export type PublicationSlug = keyof typeof PUBLICATIONS;

export function isPublicationSlug(slug: string): slug is PublicationSlug {
  return slug in PUBLICATIONS;
}

export function issuePath(slug: PublicationSlug, id: number) {
  return `/resources/${slug}/${id}`;
}

export type IssueRow = {
  id: number;
  title: string | null;
  published_at: string | null;
  r2_key: string | null;
  kind: string | null;
  original_filename: string | null;
};

export function issueNumber(title: string | null) {
  const m = (title ?? "").match(/\bNo\.?\s*(\d{1,4})\b/i);
  return m ? Number(m[1]) : null;
}

async function boardId(slug: PublicationSlug) {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.from("boards").select("id").eq("slug", slug).maybeSingle<{ id: number }>();
  return data?.id ?? null;
}

const ISSUE_COLUMNS = "id,title,published_at,r2_key,kind,original_filename";

async function fetchIssueUncached(slug: PublicationSlug, id: number) {
  const bid = await boardId(slug);
  if (!bid) return null;
  const supabase = createSupabaseServerClient();
  const { data: issue } = await supabase
    .from("resources")
    .select(ISSUE_COLUMNS)
    .eq("id", id)
    .eq("board_id", bid)
    .eq("visibility", "public")
    .is("deleted_at", null)
    .maybeSingle<IssueRow>();
  if (!issue) return null;

  // Neighbours by publication date (ties broken by id) for previous/next links.
  const date = issue.published_at ?? "0000-00-00";
  const base = () =>
    supabase.from("resources").select("id,title,published_at").eq("board_id", bid).eq("visibility", "public").is("deleted_at", null);
  const [older, newer] = await Promise.all([
    base()
      .or(`published_at.lt.${date},and(published_at.eq.${date},id.lt.${id})`)
      .order("published_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1),
    base()
      .or(`published_at.gt.${date},and(published_at.eq.${date},id.gt.${id})`)
      .order("published_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(1),
  ]);
  type Neighbour = Pick<IssueRow, "id" | "title" | "published_at">;
  return {
    issue,
    older: ((older.data ?? [])[0] as Neighbour | undefined) ?? null,
    newer: ((newer.data ?? [])[0] as Neighbour | undefined) ?? null,
  };
}

export const fetchIssue = unstable_cache(fetchIssueUncached, ["publications:fetchIssue"], {
  revalidate: 3600,
  tags: [CACHE_TAGS.resources],
});

function r2() {
  return new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT ?? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true,
  });
}

async function openPdf(r2Key: string) {
  const object = await r2().send(new GetObjectCommand({ Bucket: process.env.R2_PUBLIC_BUCKET!, Key: r2Key }));
  return getDocumentProxy(new Uint8Array(await object.Body!.transformToByteArray()));
}

type Pdf = Awaited<ReturnType<typeof openPdf>>;

// Same text as unpdf's extractText, but only for the pages asked for.
async function pageTexts(pdf: Pdf, count: number) {
  const pages: string[] = [];
  for (let i = 1; i <= Math.min(count, pdf.numPages); i++) {
    const content = await (await pdf.getPage(i)).getTextContent();
    pages.push(content.items.map((it) => ("str" in it ? it.str + (it.hasEOL ? "\n" : "") : "")).join(""));
  }
  return pages;
}

// Heartbeat's column and table of contents sit in the first pages; reading
// 12 of ~150-200 pages is what keeps a first view fast. Only older issues
// without a contents page need the whole file (for their section headings).
const HEARTBEAT_HEAD_PAGES = 12;

export type IssueContent =
  | { kind: "atm"; atm: AtmIssue }
  | { kind: "heartbeat"; heartbeat: HeartbeatIssue }
  | { kind: "none" };

// Keyed by the storage key, so replacing the file produces fresh text.
async function readIssueContentUncached(slug: PublicationSlug, r2Key: string): Promise<IssueContent> {
  if (!r2Key.toLowerCase().endsWith(".pdf")) return { kind: "none" };
  try {
    const pdf = await openPdf(r2Key);
    if (slug === "atm") return { kind: "atm", atm: parseAtm((await pageTexts(pdf, 1))[0] ?? "") };
    const head = await pageTexts(pdf, HEARTBEAT_HEAD_PAGES);
    const parsed = parseHeartbeat(head);
    const hasContents = parsed.toc.some((section) => section.items.length > 0);
    if (hasContents || pdf.numPages <= HEARTBEAT_HEAD_PAGES) return { kind: "heartbeat", heartbeat: parsed };
    return { kind: "heartbeat", heartbeat: parseHeartbeat(await pageTexts(pdf, pdf.numPages)) };
  } catch (error) {
    console.error("[publications] could not read PDF", r2Key, error);
    return { kind: "none" };
  }
}

// A file's text never changes (a replaced file gets a new key), so the parsed
// result is kept until the parser itself changes (bump the version then). It
// has its own tag so routine admin edits, which expire the "resources" tag,
// do not throw away work that took seconds to produce.
export const readIssueContent = unstable_cache(readIssueContentUncached, ["publications:content:v2"], {
  revalidate: false,
  tags: ["publication-content"],
});

// Read a newly uploaded issue right away, so its first visitor gets a cached page.
export async function warmIssueContent(boardSlug: string, r2Key: string | null | undefined) {
  if (!r2Key || !isPublicationSlug(boardSlug)) return;
  await readIssueContent(boardSlug, r2Key);
}

async function fetchLatestIssueRowUncached(slug: PublicationSlug) {
  const bid = await boardId(slug);
  if (!bid) return null;
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("resources")
    .select(ISSUE_COLUMNS)
    .eq("board_id", bid)
    .eq("visibility", "public")
    .is("deleted_at", null)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle<IssueRow>();
  return data ?? null;
}

const fetchLatestIssueRow = unstable_cache(fetchLatestIssueRowUncached, ["publications:latest"], {
  revalidate: 600,
  tags: [CACHE_TAGS.resources],
});

// The newest public issue with its parsed text, for the home page.
export async function fetchLatestIssue(slug: PublicationSlug) {
  const issue = await fetchLatestIssueRow(slug);
  if (!issue) return null;
  const content: IssueContent = issue.r2_key ? await readIssueContent(slug, issue.r2_key) : { kind: "none" };
  return { issue, content };
}

export async function fetchPublicationIssueIds() {
  const supabase = createSupabaseServerClient();
  const out: { slug: PublicationSlug; id: number; published_at: string | null }[] = [];
  for (const slug of Object.keys(PUBLICATIONS) as PublicationSlug[]) {
    const bid = await boardId(slug);
    if (!bid) continue;
    const { data } = await supabase
      .from("resources")
      .select("id,published_at")
      .eq("board_id", bid)
      .eq("visibility", "public")
      .is("deleted_at", null)
      .order("published_at", { ascending: false })
      .limit(2000);
    for (const row of data ?? []) out.push({ slug, id: row.id, published_at: row.published_at });
  }
  return out;
}

// One-line summary used for <meta description> and share cards.
export function issueSummary(content: IssueContent, fallback: string) {
  if (content.kind === "atm" && content.atm.items.length) return content.atm.items.map((it) => it.title).join(" · ");
  if (content.kind === "heartbeat") {
    const col = content.heartbeat.column;
    if (col) return [col.title, col.paragraphs[0]].filter(Boolean).join(" — ");
    if (content.heartbeat.toc.length) return content.heartbeat.toc.map((s) => s.title).join(" · ");
  }
  return fallback;
}

export function cut(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

import { NextResponse, after } from "next/server";
import { warmIssueContent } from "@/lib/publications";
import { S3Client, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { requireAdminOrThrow } from "@/lib/requireAdmin";
import { CACHE_TAGS, invalidatePublicCache } from "@/lib/publicCache";
import { errorMessage, errorStatus } from "@/lib/errors";
import { ISSUE_BOARD_SLUGS } from "@/lib/resourceFilters";
import { inferKindFromFileName, isYmd, kstTodayYmd } from "@/lib/uploadRules";

export const runtime = "nodejs";

// Step 2 of a direct upload: the file is already in R2, so check it is really
// there and then add the resources row. If the insert fails the object is
// removed, so storage never keeps a file the database does not know about.

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

const sbAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

type Visibility = "public" | "member" | "admin";
const VISIBILITIES = new Set<Visibility>(["public", "member", "admin"]);

export async function POST(req: Request) {
  try {
    await requireAdminOrThrow();

    const body = await req.json().catch(() => ({}));
    const boardSlug = String(body.boardSlug ?? "").trim();
    const key = String(body.key ?? "").trim();
    const title = String(body.title ?? "").trim();
    const note = String(body.note ?? "").trim();
    const originalFilename = String(body.originalFilename ?? "").trim();
    const visibility = String(body.visibility ?? "public") as Visibility;
    const date = String(body.date ?? "").trim();

    if (!title) return NextResponse.json({ ok: false, error: "제목을 입력하세요." }, { status: 400 });
    if (!VISIBILITIES.has(visibility)) return NextResponse.json({ ok: false, error: "invalid visibility" }, { status: 400 });
    // Only keys issued for this board by the presign step are accepted.
    if (!boardSlug || !key.startsWith(`${boardSlug}/`) || key.includes("..")) {
      return NextResponse.json({ ok: false, error: "invalid key" }, { status: 400 });
    }
    const kind = inferKindFromFileName(originalFilename || key);
    if (!kind) return NextResponse.json({ ok: false, error: "지원하지 않는 파일 형식입니다." }, { status: 400 });

    const isIssue = ISSUE_BOARD_SLUGS.has(boardSlug);
    if (isIssue && !isYmd(date)) {
      return NextResponse.json({ ok: false, error: "ATM·Heartbeat 자료는 발간일이 필요합니다." }, { status: 400 });
    }
    if (date && !isYmd(date)) return NextResponse.json({ ok: false, error: "날짜는 YYYY-MM-DD 형식이어야 합니다." }, { status: 400 });

    const { data: board } = await sbAdmin.from("boards").select("id").eq("slug", boardSlug).maybeSingle();
    if (!board) return NextResponse.json({ ok: false, error: "invalid boardSlug" }, { status: 400 });

    const bucket = visibility === "public" ? process.env.R2_PUBLIC_BUCKET! : process.env.R2_PRIVATE_BUCKET!;
    const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key })).catch(() => null);
    if (!head) {
      return NextResponse.json({ ok: false, error: "저장소에서 파일을 찾지 못했습니다. 다시 올려 주세요." }, { status: 409 });
    }

    // Same date rules as the form upload route: issue boards keep their
    // publication date; other boards use the given date or today (KST).
    const postedAt = !isIssue && date ? date : kstTodayYmd();
    const publishedAt = isIssue ? date : postedAt;

    const { data: inserted, error } = await sbAdmin
      .from("resources")
      .insert({
        board_id: board.id,
        title,
        kind,
        posted_at: postedAt,
        published_at: publishedAt,
        visibility,
        r2_key: key,
        mime: head.ContentType ?? null,
        size_bytes: head.ContentLength ?? null,
        original_filename: originalFilename || null,
        note: note || null,
      })
      .select("id")
      .maybeSingle();

    if (error || !inserted) {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch(() => null);
      return NextResponse.json({ ok: false, error: "db insert failed", detail: error?.message }, { status: 500 });
    }

    invalidatePublicCache(CACHE_TAGS.resources);
    // Visibility public only: member/admin files never become page text.
    if (visibility === "public") after(() => warmIssueContent(boardSlug, key));
    return NextResponse.json({ ok: true, id: inserted.id });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: errorMessage(e) }, { status: errorStatus(e) });
  }
}

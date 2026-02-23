import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { requireAdminOrThrow } from "@/lib/requireAdmin";

export const runtime = "nodejs";

function inferKindFromFileName(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "image";
  if (["mp4", "mov", "webm", "mkv"].includes(ext)) return "video";
  if (["ppt", "pptx", "key"].includes(ext)) return "slide";
  if (["doc", "docx", "hwp", "txt"].includes(ext)) return "doc";
  if (["zip", "7z", "rar"].includes(ext)) return "zip";
  return null;
}
function safeName(name: string) {
  return name.replace(/[^\w.\-]+/g, "_");
}
function isYmd(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}
function kstTodayYmd() {
  // KST 기준 날짜 문자열
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

// 업로드 제한
const MAX_FILE_BYTES = 200 * 1024 * 1024;

type Visibility = "public" | "member" | "admin";
const VIS_SET = new Set<Visibility>(["public", "member", "admin"]);

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

const ISSUE_BOARDS = new Set(["atm", "heartbeat-of-atoms"]); // 발간일이 의미있는 보드

export async function POST(req: Request) {
  try {
    await requireAdminOrThrow();

    const form = await req.formData();
    const title = String(form.get("title") || "").trim();
    const boardSlug = String(form.get("boardSlug") || "").trim();
    const visibilityRaw = String(form.get("visibility") || "public").trim() as Visibility;
    const displayname = String(form.get("displayname") || "").trim();
    const publishedAtRaw = String(form.get("publishedAt") || "").trim(); // ymd
    const note = String(form.get("note") || "").trim();
    const source_path = String(form.get("source_path") || "").trim();

    const file = form.get("file");

    if (!title) return NextResponse.json({ ok: false, error: "title is required" }, { status: 400 });
    if (!boardSlug) return NextResponse.json({ ok: false, error: "boardSlug is required" }, { status: 400 });
    if (!VIS_SET.has(visibilityRaw)) {
      return NextResponse.json({ ok: false, error: "invalid visibility" }, { status: 400 });
    }
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "file is required" }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ ok: false, error: `file too large (max ${MAX_FILE_BYTES} bytes)` }, { status: 413 });
    }

    const kind = inferKindFromFileName(file.name);
    if (!kind) return NextResponse.json({ ok: false, error: "unsupported file type" }, { status: 400 });

    // boards.id 조회
    const { data: board, error: boardErr } = await sbAdmin
      .from("boards")
      .select("id")
      .eq("slug", boardSlug)
      .maybeSingle();

    if (boardErr || !board) {
      return NextResponse.json({ ok: false, error: "invalid boardSlug", detail: boardErr?.message }, { status: 400 });
    }

    const posted_at = kstTodayYmd();
    const published_at =
      ISSUE_BOARDS.has(boardSlug)
        ? (isYmd(publishedAtRaw) ? publishedAtRaw : "")
        : posted_at;

    if (ISSUE_BOARDS.has(boardSlug) && !published_at) {
      return NextResponse.json({ ok: false, error: "publishedAt is required for ATM/Heartbeat" }, { status: 400 });
    }

    // R2 업로드
    const bucket = visibilityRaw === "public" ? process.env.R2_PUBLIC_BUCKET! : process.env.R2_PRIVATE_BUCKET!;
    const key = `${boardSlug}/${Date.now()}-${safeName(file.name)}`;
    const buf = Buffer.from(await file.arrayBuffer());

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buf,
        ContentType: file.type || "application/octet-stream",
      })
    );

    // DB insert (새 스키마 반영: posted_at, views_count는 default)
    const { data: inserted, error: insErr } = await sbAdmin
      .from("resources")
      .insert({
        board_id: board.id,
        title,
        kind,
        posted_at,            // 유저 UI에 보이는 날짜
        published_at,         // ATM/Heartbeat 검색용
        displayname: displayname || null,
        visibility: visibilityRaw,
        r2_key: key,
        mime: file.type || null,
        size_bytes: buf.length,
        original_filename: file.name,
        note: note || null,
        source_path: source_path || null,
      })
      .select("id,title,board_id,kind,posted_at,published_at,r2_key,original_filename,visibility")
      .maybeSingle();

    if (insErr || !inserted) {
      return NextResponse.json({ ok: false, error: "db insert failed", detail: insErr?.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, resource: inserted });
  } catch (e: any) {
    const status = e?.status ?? 500;
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status });
  }
}
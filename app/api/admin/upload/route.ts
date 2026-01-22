import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET() {
  // 굳이 열어둘 필요 없으면 삭제해도 됨.
  return NextResponse.json({ ok: true, route: "/api/admin/upload" });
}

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

function getBearerToken(authHeader: string) {
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  return m?.[1] || null;
}

function isYmd(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 업로드 제한(원하는 값으로 조절)
const MAX_FILE_BYTES = 200 * 1024 * 1024; // 200MB

type Visibility = "public" | "member" | "admin";
const VIS_SET = new Set<Visibility>(["public", "member", "admin"]);

export async function POST(req: Request) {
  // 1) 토큰 확인
  const authHeader = req.headers.get("authorization") || "";
  const token = getBearerToken(authHeader);
  if (!token) {
    return NextResponse.json({ ok: false, error: "missing auth token" }, { status: 401 });
  }

  // 2) 토큰 검증 (anon key로 충분)
  const supabaseAnon = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: userData, error: userErr } = await supabaseAnon.auth.getUser(token);
  const user = userData?.user;
  if (userErr || !user) {
    return NextResponse.json({ ok: false, error: "invalid token" }, { status: 401 });
  }

  // 3) admin/approved 확인 (service role)
  const { data: profile, error: profErr } = await supabaseAdmin
    .from("profiles")
    .select("role, approved")
    .eq("id", user.id)
    .maybeSingle();

  if (profErr) {
    return NextResponse.json({ ok: false, error: profErr.message }, { status: 500 });
  }
  if (!profile || profile.role !== "admin" || profile.approved !== true) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  try {
    const form = await req.formData();

    const title = String(form.get("title") || "").trim();
    const boardSlug = String(form.get("boardSlug") || "heartbeat-of-atoms").trim();
    const visibilityRaw = String(form.get("visibility") || "public").trim() as Visibility;
    const displayname = String(form.get("displayname") || "").trim();
    const publishedAt = String(form.get("publishedAt") || "").trim(); // "YYYY-MM-DD"

    const file = form.get("file");

    if (!title) return NextResponse.json({ ok: false, error: "title is required" }, { status: 400 });
    if (!boardSlug) return NextResponse.json({ ok: false, error: "boardSlug is required" }, { status: 400 });

    if (!VIS_SET.has(visibilityRaw)) {
      return NextResponse.json({ ok: false, error: "invalid visibility" }, { status: 400 });
    }
    const visibility = visibilityRaw;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "file is required" }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ ok: false, error: `file too large (max ${MAX_FILE_BYTES} bytes)` }, { status: 413 });
    }

    const kind = inferKindFromFileName(file.name);
    if (!kind) {
      return NextResponse.json({ ok: false, error: "unsupported file type" }, { status: 400 });
    }

    // 1차 테스트
    if (process.env.UPLOAD_STAGE === "1") {
      return NextResponse.json({
        ok: true,
        stage: 1,
        received: {
          title,
          boardSlug,
          visibility,
          kind,
          name: file.name,
          type: file.type,
          size: file.size,
        },
      });
    }

    // boards.id 찾기
    const { data: board, error: boardErr } = await supabaseAdmin
      .from("boards")
      .select("id")
      .eq("slug", boardSlug)
      .maybeSingle();

    if (boardErr || !board) {
      return NextResponse.json({ ok: false, error: "invalid boardSlug", detail: boardErr?.message }, { status: 400 });
    }

    // R2 업로드 (public만 public bucket)
    const bucket =
      visibility === "public" ? process.env.R2_PUBLIC_BUCKET! : process.env.R2_PRIVATE_BUCKET!;

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

    // 2차 테스트
    if (process.env.UPLOAD_STAGE === "2") {
      const publicUrl =
        visibility === "public" ? `${process.env.R2_PUBLIC_BASE_URL}/${key}` : null;
      return NextResponse.json({ ok: true, stage: 2, key, bucket, publicUrl });
    }

    const todayYmd = () => new Date().toISOString().slice(0, 10);
    const published_at = isYmd(publishedAt) ? publishedAt : todayYmd();

    // DB 저장
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("resources")
      .insert({
        board_id: board.id,
        title,
        kind,
        published_at,
        displayname: displayname ? displayname : null,
        visibility,
        r2_key: key,
        mime: file.type || null,
        size_bytes: buf.length,
        original_filename: file.name,
      })
      .select("*")
      .maybeSingle();

    if (insErr || !inserted) {
      return NextResponse.json({ ok: false, error: "db insert failed", detail: insErr?.message }, { status: 500 });
    }

    const publicUrl =
      visibility === "public" ? `${process.env.R2_PUBLIC_BASE_URL}/${key}` : null;

    return NextResponse.json({ ok: true, resource: inserted, publicUrl });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown error" }, { status: 500 });
  }
}
// app/api/admin/upload/route.ts
import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/admin/upload" });
}

const allowedKinds = new Set(["pdf", "image", "video", "post", "slide", "doc", "zip", "link"]);

function inferKindFromFileName(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "image";
  if (["mp4", "mov", "webm", "mkv"].includes(ext)) return "video";
  if (["ppt", "pptx", "key"].includes(ext)) return "slide";
  if (["doc", "docx", "hwp", "txt"].includes(ext)) return "doc";
  if (["zip", "7z", "rar"].includes(ext)) return "zip";
  // post/link는 “파일 업로드” 흐름이면 안 받음(별도 기능)
  return null;
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
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // 서버 전용
);

function supabaseFromAuthHeader(authHeader: string) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: authHeader } },
  });
}

function safeName(name: string) {
  return name.replace(/[^\w.\-]+/g, "_");
}

export async function POST(req: Request) {

  // 1) 로그인 토큰 확인
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "missing auth token" }, { status: 401 });
  }

  // 2) 토큰이 진짜인지 확인
  const supabaseAuth = supabaseFromAuthHeader(authHeader);
  const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
  const user = userData?.user;
  if (userErr || !user) {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }

  // 3) profiles에서 admin/approved 확인
  const { data: profile, error: profErr } = await supabaseAdmin
    .from("profiles")
    .select("role, approved")
    .eq("id", user.id)
    .single();

  if (profErr || !profile) {
    return NextResponse.json({ error: "profile not found" }, { status: 403 });
  }

  if (profile.role !== "admin" || profile.approved !== true) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const form = await req.formData();
    
    function isYmd(s: string) {
      return /^\d{4}-\d{2}-\d{2}$/.test(s);
    }

    // 필드들 (너가 admin 업로드 폼에서 같이 보내면 됨)
    const title = String(form.get("title") || "");
    const boardSlug = String(form.get("boardSlug") || "heartbeat-of-atoms");
    const visibility = String(form.get("visibility") || "public") as "public" | "member" | "admin"
    const displaynameRaw = String(form.get("displayname") || "");
    const displayname = displaynameRaw.trim();
    const publishedAt = String(form.get("publishedAt") || ""); // "2026-01-08" 같은 형태

    const file = form.get("file");
    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const inferred = inferKindFromFileName(file.name);
    if (!inferred) {
      return NextResponse.json({ error: "unsupported file type" }, { status: 400 });
    }
    const kind = inferred;

    // 1) 서버 업로드 테스트 (1차 테스트) 

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

    // 1) boards.id 찾기
    const { data: board, error: boardErr } = await supabaseAdmin
      .from("boards")
      .select("id")
      .eq("slug", boardSlug)
      .single();

    if (boardErr || !board) {
      return NextResponse.json({ error: "invalid boardSlug", detail: boardErr?.message }, { status: 400 });
    }

    // 2) R2 업로드 (public/member/admin에 따라 버킷 분기)
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
      }),
    );

    // 2) R2 업로드 테스트 (2차 테스트)

    if (process.env.UPLOAD_STAGE === "2") {
      const publicUrl =
        visibility === "public" ? `${process.env.R2_PUBLIC_BASE_URL}/${key}` : null;
      return NextResponse.json({
        ok: true,
        stage: 2,
        key,
        bucket,
        publicUrl,
      });
    }

    const todayYmd = () => new Date().toISOString().slice(0, 10);
    const published_at = isYmd(publishedAt) ? publishedAt : todayYmd();

    // 3) DB에 메타데이터 저장
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("resources")
      .insert({
        board_id: board.id,
        title,
        kind,
        published_at, // publishedAt 비면 오늘 날짜로
        displayname: displayname ? displayname : null,
        visibility,
        r2_key: key,
        mime: file.type || null,
        size_bytes: buf.length,
        original_filename: file.name, // 원본 파일명 저장
      })
      .select("*")
      .single();

    if (insErr) {
      return NextResponse.json({ error: "db insert failed", detail: insErr.message }, { status: 500 });
    }

    // public이면 바로 열 수 있는 URL도 같이 내려줌
    const publicUrl =
      visibility === "public" ? `${process.env.R2_PUBLIC_BASE_URL}/${key}` : null;

    return NextResponse.json({ ok: true, resource: inserted, publicUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "unknown error" }, { status: 500 });
  }
}
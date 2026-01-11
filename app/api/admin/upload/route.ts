// app/api/admin/upload/route.ts
import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/admin/upload" });
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

function safeName(name: string) {
  return name.replace(/[^\w.\-]+/g, "_");
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    // 필드들 (너가 admin 업로드 폼에서 같이 보내면 됨)
    const title = String(form.get("title") || "");
    const boardSlug = String(form.get("boardSlug") || "heartbeat-of-atoms");
    const visibility = String(form.get("visibility") || "public") as "public" | "member" | "admin";
    const kind = String(form.get("kind") || "pdf");
    const note = String(form.get("note") || "");
    const publishedAt = String(form.get("publishedAt") || ""); // "2026-01-08" 같은 형태

    const file = form.get("file");
    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

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

    // 3) DB에 메타데이터 저장
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("resources")
      .insert({
        board_id: board.id,
        title,
        kind,
        published_at: publishedAt || null,
        note: note || null,
        visibility,
        r2_key: key,
        mime: file.type || null,
        size_bytes: buf.length,
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
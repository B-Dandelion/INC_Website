// app/api/admin/resources/replace/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const runtime = "nodejs";

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
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function supabaseFromAuthHeader(authHeader: string) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: authHeader } },
  });
}

function safeName(name: string) {
  return name.replace(/[^\w.\-]+/g, "_");
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

type Visibility = "public" | "member" | "admin";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ ok: false, error: "missing auth token" }, { status: 401 });
  }

  const supabaseAuth = supabaseFromAuthHeader(authHeader);
  const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
  const user = userData?.user;
  if (userErr || !user) {
    return NextResponse.json({ ok: false, error: "invalid token" }, { status: 401 });
  }

  const { data: profile, error: profErr } = await supabaseAdmin
    .from("profiles")
    .select("role, approved")
    .eq("id", user.id)
    .single();

  if (profErr || !profile || profile.role !== "admin" || profile.approved !== true) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  try {
    const form = await req.formData();
    const resourceIdRaw = String(form.get("resourceId") ?? "");
    const resourceId = Number(resourceIdRaw);

    const file = form.get("file");
    if (!Number.isFinite(resourceId) || resourceId <= 0) {
      return NextResponse.json({ ok: false, error: "invalid resourceId" }, { status: 400 });
    }
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "file is required" }, { status: 400 });
    }

    const inferred = inferKindFromFileName(file.name);
    if (!inferred) {
      return NextResponse.json({ ok: false, error: "unsupported file type" }, { status: 400 });
    }

    const { data: r, error: rErr } = await supabaseAdmin
      .from("resources")
      .select("id, board_id, kind, visibility, r2_key, deleted_at")
      .eq("id", resourceId)
      .single();

    if (rErr || !r) {
      return NextResponse.json({ ok: false, error: "resource not found" }, { status: 404 });
    }
    if (r.deleted_at) {
      return NextResponse.json({ ok: false, error: "resource is deleted" }, { status: 400 });
    }

    if (String(r.kind) !== inferred) {
      return NextResponse.json(
        { ok: false, error: `kind mismatch (current=${r.kind}, new=${inferred})` },
        { status: 400 },
      );
    }

    const { data: board, error: bErr } = await supabaseAdmin
      .from("boards")
      .select("slug")
      .eq("id", r.board_id)
      .single();

    if (bErr || !board?.slug) {
      return NextResponse.json({ ok: false, error: "board not found" }, { status: 500 });
    }

    const visibility = r.visibility as Visibility;
    const bucket =
      visibility === "public" ? process.env.R2_PUBLIC_BUCKET! : process.env.R2_PRIVATE_BUCKET!;

    const key = `${board.slug}/${resourceId}/${Date.now()}-${safeName(file.name)}`;

    const buf = Buffer.from(await file.arrayBuffer());
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buf,
        ContentType: file.type || "application/octet-stream",
      }),
    );

    const { data: updated, error: upErr } = await supabaseAdmin
      .from("resources")
      .update({
        r2_key: key,
        mime: file.type || null,
        size_bytes: buf.length,
        original_filename: file.name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", resourceId)
      .select("id, r2_key, original_filename, mime, size_bytes, updated_at")
      .single();

    if (upErr || !updated) {
      return NextResponse.json({ ok: false, error: upErr?.message || "db update failed" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      resource: updated,
      oldKey: r.r2_key,
      newKey: key,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown error" }, { status: 500 });
  }
}
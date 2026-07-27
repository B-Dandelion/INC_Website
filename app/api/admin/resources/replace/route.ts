import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { requireAdminOrThrow } from "@/lib/requireAdmin";

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
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
  try {
    await requireAdminOrThrow();

    const form = await req.formData();
    const resourceId = Number(String(form.get("resourceId") ?? ""));
    const file = form.get("file");

    if (!Number.isFinite(resourceId) || resourceId <= 0) {
      return NextResponse.json(
        { ok: false, error: "invalid resourceId" },
        { status: 400 }
      );
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "file is required" },
        { status: 400 }
      );
    }

    const maxFileBytes = 200 * 1024 * 1024;
    if (file.size > maxFileBytes) {
      return NextResponse.json(
        { ok: false, error: "file too large (max 200MB)" },
        { status: 413 }
      );
    }

    const inferred = inferKindFromFileName(file.name);

    if (!inferred) {
      return NextResponse.json(
        { ok: false, error: "unsupported file type" },
        { status: 400 }
      );
    }

    const { data: resource, error: resourceError } = await supabaseAdmin
      .from("resources")
      .select("id, board_id, kind, visibility, r2_key, deleted_at")
      .eq("id", resourceId)
      .maybeSingle();

    if (resourceError || !resource) {
      return NextResponse.json(
        { ok: false, error: "resource not found" },
        { status: 404 }
      );
    }

    if (resource.deleted_at) {
      return NextResponse.json(
        { ok: false, error: "resource is deleted" },
        { status: 400 }
      );
    }

    // 포스터는 이미지와 PDF 사이의 형식 변경을 허용합니다.
    // 다른 자료는 기존처럼 같은 kind끼리만 교체합니다.
    const { data: assetLinks, error: assetLinksError } =
      await supabaseAdmin
        .from("event_assets")
        .select("role")
        .eq("resource_id", resourceId);

    if (assetLinksError) {
      return NextResponse.json(
        { ok: false, error: assetLinksError.message },
        { status: 500 }
      );
    }

    const linkedRoles = (assetLinks ?? []).map((row) => String(row.role));
    const isPosterResource =
      linkedRoles.length > 0 &&
      linkedRoles.every((role) =>
        ["poster_ko", "poster_en"].includes(role)
      );

    if (String(resource.kind) !== inferred && !isPosterResource) {
      return NextResponse.json(
        {
          ok: false,
          error: `kind mismatch (current=${resource.kind}, new=${inferred})`,
        },
        { status: 400 }
      );
    }

    const { data: board, error: boardError } = await supabaseAdmin
      .from("boards")
      .select("slug")
      .eq("id", resource.board_id)
      .maybeSingle();

    if (boardError || !board?.slug) {
      return NextResponse.json(
        { ok: false, error: "board not found" },
        { status: 500 }
      );
    }

    const visibility = resource.visibility as Visibility;
    const bucket =
      visibility === "public"
        ? process.env.R2_PUBLIC_BUCKET!
        : process.env.R2_PRIVATE_BUCKET!;

    const key = `${board.slug}/${resourceId}/${Date.now()}-${safeName(
      file.name
    )}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
      })
    );

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("resources")
      .update({
        kind: inferred,
        r2_key: key,
        mime: file.type || null,
        size_bytes: buffer.length,
        original_filename: file.name,
        source_path: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", resourceId)
      .select(
        "id, kind, r2_key, original_filename, mime, size_bytes, updated_at"
      )
      .maybeSingle();

    if (updateError || !updated) {
      await s3
        .send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
        .catch(() => null);

      return NextResponse.json(
        {
          ok: false,
          error: updateError?.message || "db update failed",
        },
        { status: 500 }
      );
    }

    let cleanupWarning: string | null = null;

    if (resource.r2_key && resource.r2_key !== key) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: resource.r2_key,
          })
        );
      } catch (cleanupError: any) {
        cleanupWarning = String(
          cleanupError?.message ?? cleanupError
        );
      }
    }

    return NextResponse.json({
      ok: true,
      resource: updated,
      oldKey: resource.r2_key,
      newKey: key,
      cleanupWarning,
    });
  } catch (e: any) {
    const status = e?.status ?? 500;

    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status }
    );
  }
}

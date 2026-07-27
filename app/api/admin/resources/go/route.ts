import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireAdminOrThrow } from "@/lib/requireAdmin";

export const runtime = "nodejs";

const sb = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

export async function GET(req: Request) {
  try {
    await requireAdminOrThrow();

    const url = new URL(req.url);
    const id = Number(url.searchParams.get("id"));

    if (!Number.isFinite(id) || id <= 0) {
      return new NextResponse("bad id", { status: 400 });
    }

    const { data: resource, error } = await sb
      .from("resources")
      .select(
        "id,r2_key,source_path,visibility,mime,original_filename,deleted_at"
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return new NextResponse(error.message, { status: 500 });
    }

    if (!resource || resource.deleted_at) {
      return new NextResponse("not found", { status: 404 });
    }

    const sourcePath = String(resource.source_path ?? "").trim();
    if (/^https?:\/\//i.test(sourcePath)) {
      return NextResponse.redirect(sourcePath, 302);
    }

    if (!resource.r2_key) {
      return new NextResponse("missing r2 key", { status: 404 });
    }

    const bucket =
      resource.visibility === "public"
        ? process.env.R2_PUBLIC_BUCKET!
        : process.env.R2_PRIVATE_BUCKET!;

    const signedUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: bucket,
        Key: resource.r2_key,
        ResponseContentType: resource.mime || undefined,
        ResponseContentDisposition: `inline; filename="${String(
          resource.original_filename || "file"
        ).replaceAll('"', "")}"`,
      }),
      { expiresIn: 60 }
    );

    return NextResponse.redirect(signedUrl, 302);
  } catch (error: any) {
    return new NextResponse(String(error?.message ?? error), {
      status: error?.status ?? 500,
    });
  }
}

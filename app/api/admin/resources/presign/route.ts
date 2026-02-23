import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireAdminOrThrow } from "@/lib/requireAdmin";
import { isSensitiveFilename } from "@/lib/piiBlock";

export const runtime = "nodejs";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: Request) {
  const guard = await requireAdminOrThrow();
  
  const body = await req.json().catch(() => ({}));
  const fileName = String(body.fileName ?? "").trim();
  const contentType = String(body.contentType ?? "application/octet-stream");

  if (!fileName) {
    return NextResponse.json({ ok: false, error: "fileName required" }, { status: 400 });
  }

  if (isSensitiveFilename(fileName)) {
    return NextResponse.json(
      { ok: false, error: "PII-suspected filename blocked" },
      { status: 400 }
    );
  }

  const safeName = fileName.replace(/[^\w.\-()\s]/g, "_");
  const key = `resources/${Date.now()}_${safeName}`;

  const cmd = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET!,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2, cmd, { expiresIn: 60 * 5 });

  return NextResponse.json({ ok: true, uploadUrl, key });
}
import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const runtime = "nodejs"; // presign은 node runtime 필요 (edge X)

function filenameFromKey(key: string) {
  const last = key.split("/").pop() || "file";
  return last;
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "missing key" }, { status: 400 });

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_PUBLIC_BUCKET;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    return NextResponse.json(
      { error: "missing R2 env", need: ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"] },
      { status: 500 }
    );
  }

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  const filename = filenameFromKey(key);

  const cmd = new GetObjectCommand({
    Bucket: bucket,
    Key: key,

    ResponseContentDisposition: `inline; filename="${filename}"`,
    // pdf가 대부분이면 이렇게 고정해도 됨. (DB에 mime 있으면 그걸로)
    ResponseContentType: "application/pdf",
  });

  // 너가 준 예시는 Expires=60 이었지
  const signedUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 });

  return NextResponse.redirect(signedUrl);
}
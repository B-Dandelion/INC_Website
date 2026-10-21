import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@supabase/supabase-js";
import { requireAdminOrThrow } from "@/lib/requireAdmin";
import { isSensitiveFilename } from "@/lib/piiBlock";
import { errorMessage, errorStatus } from "@/lib/errors";
import { MAX_UPLOAD_BYTES, inferKindFromFileName, safeObjectName } from "@/lib/uploadRules";

export const runtime = "nodejs";

// Step 1 of a direct upload: hand the browser a short-lived URL so the file
// goes straight to R2 instead of through this function (Vercel caps request
// bodies at 4.5MB). Step 2 is /api/admin/resources/finalize.

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

const VISIBILITIES = new Set(["public", "member", "admin"]);

export async function POST(req: Request) {
  try {
    await requireAdminOrThrow();

    const body = await req.json().catch(() => ({}));
    const boardSlug = String(body.boardSlug ?? "").trim();
    const fileName = String(body.fileName ?? "").trim();
    const contentType = String(body.contentType || "application/octet-stream");
    const size = Number(body.size);
    const visibility = String(body.visibility ?? "public");

    if (!fileName) return NextResponse.json({ ok: false, error: "fileName required" }, { status: 400 });
    if (!VISIBILITIES.has(visibility)) return NextResponse.json({ ok: false, error: "invalid visibility" }, { status: 400 });
    if (!Number.isFinite(size) || size <= 0) return NextResponse.json({ ok: false, error: "빈 파일은 올릴 수 없습니다." }, { status: 400 });
    if (size > MAX_UPLOAD_BYTES) return NextResponse.json({ ok: false, error: "파일 크기는 200MB 이하여야 합니다." }, { status: 413 });
    if (!inferKindFromFileName(fileName)) return NextResponse.json({ ok: false, error: "지원하지 않는 파일 형식입니다." }, { status: 400 });
    if (isSensitiveFilename(fileName)) {
      return NextResponse.json(
        { ok: false, error: "개인정보가 담긴 파일로 보이는 이름이라 막았습니다. 파일 이름을 확인해 주세요." },
        { status: 400 },
      );
    }

    const { data: board } = await sbAdmin.from("boards").select("id").eq("slug", boardSlug).maybeSingle();
    if (!board) return NextResponse.json({ ok: false, error: "invalid boardSlug" }, { status: 400 });

    const key = `${boardSlug}/${Date.now()}-${safeObjectName(fileName)}`;
    const bucket = visibility === "public" ? process.env.R2_PUBLIC_BUCKET! : process.env.R2_PRIVATE_BUCKET!;
    const uploadUrl = await getSignedUrl(s3, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }), {
      expiresIn: 60 * 10,
    });

    return NextResponse.json({ ok: true, uploadUrl, key });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: errorMessage(e) }, { status: errorStatus(e) });
  }
}

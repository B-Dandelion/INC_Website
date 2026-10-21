// app/api/resources/media/route.ts
// Files shown *inside* a page (photos, posters, thumbnails) load from here so
// that merely displaying them does not count as a view. Opening a file on
// purpose still goes through /api/resources/go, which counts.
//
//   ?id=123          redirect to the original file
//   ?id=123&w=640    resized WebP (320 / 640 / 1280), cached by the CDN
//   ?id=123&dl=1     original file, recorded as a download (no view)
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { hasAdminSession } from "@/lib/requireAdmin";
import { recordSiteAnalyticsEvent } from "@/lib/siteAnalyticsServer";

export const runtime = "nodejs";

const WIDTHS = [320, 640, 1280];
const RESIZABLE = /^image\/(jpe?g|png|webp|avif|tiff)$/i;

type MediaRow = {
  id: number;
  r2_key: string | null;
  mime: string | null;
  original_filename: string | null;
  visibility: string | null;
  deleted_at: string | null;
};

function sbAdmin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

function s3() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

function mimeOf(row: MediaRow) {
  if (row.mime) return row.mime;
  const ext = (row.original_filename ?? "").split(".").pop()?.toLowerCase();
  return ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "";
}

async function redirectToOriginal(row: MediaRow, isPublic: boolean) {
  const url = await getSignedUrl(s3(), new GetObjectCommand({ Bucket: process.env.R2_PUBLIC_BUCKET!, Key: row.r2_key! }), { expiresIn: 3600 });
  const res = NextResponse.redirect(url, 302);
  // Shorter than the signature's lifetime so a cached redirect never points at an expired URL.
  res.headers.set("Cache-Control", isPublic ? "private, max-age=3000" : "private, no-store");
  return res;
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const id = Number(sp.get("id"));
  if (!Number.isInteger(id) || id <= 0) return new NextResponse("bad id", { status: 400 });

  const { data, error } = await sbAdmin()
    .from("resources")
    .select("id,r2_key,mime,original_filename,visibility,deleted_at")
    .eq("id", id)
    .maybeSingle<MediaRow>();
  if (error) return new NextResponse("lookup failed", { status: 500 });
  if (!data?.r2_key) return new NextResponse("not found", { status: 404 });

  const isPublic = data.visibility === "public" && !data.deleted_at;
  if (!isPublic && !(await hasAdminSession())) return new NextResponse("not found", { status: 404 });

  if (sp.get("dl") === "1") {
    await recordSiteAnalyticsEvent({ request: req, eventType: "download", path: "/api/resources/media", resourceId: data.id });
    return redirectToOriginal(data, isPublic);
  }

  const w = Number(sp.get("w"));
  if (!WIDTHS.includes(w) || !RESIZABLE.test(mimeOf(data))) return redirectToOriginal(data, isPublic);

  try {
    const out = await s3().send(new GetObjectCommand({ Bucket: process.env.R2_PUBLIC_BUCKET!, Key: data.r2_key }));
    if (!out.Body) return redirectToOriginal(data, isPublic);
    const input = Buffer.from(await out.Body.transformToByteArray());
    const sharp = (await import("sharp")).default;
    const body = await sharp(input, { failOn: "none" })
      .rotate()
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: 74 })
      .toBuffer();
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": isPublic ? "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800" : "private, no-store",
      },
    });
  } catch {
    // Unusual formats (e.g. HEIC) fall back to the original.
    return redirectToOriginal(data, isPublic);
  }
}

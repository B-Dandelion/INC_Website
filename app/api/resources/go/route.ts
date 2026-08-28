// app/api/resources/go/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "node:stream";
import { recordSiteAnalyticsEvent } from "@/lib/siteAnalyticsServer";

export const runtime = "nodejs";

type GoRow = {
  id: number;
  r2_key: string;
  original_filename: string;
  mime: string | null;
  kind: string;
};

function sbAdmin() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
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

function bucketForKey(_r2Key: string) {
  return process.env.R2_PUBLIC_BUCKET!;
}

function contentDisposition(kind: string, filename: string) {
  const safe = (filename || "file").replaceAll('"', "");
  const inline = kind === "pdf" || kind === "image" || kind === "video";
  return `${inline ? "inline" : "attachment"}; filename="${safe}"`;
}

function toWeb(body: any) {
  if (body instanceof Readable) return Readable.toWeb(body);
  return body;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const idStr = url.searchParams.get("id");
  const id = Number(idStr);

  if (!Number.isFinite(id) || id <= 0) {
    return new NextResponse("bad id", { status: 400 });
  }

  const sb = sbAdmin();
  const { data, error } = await sb.rpc("go_resource", { p_id: id });
  if (error) return new NextResponse(error.message, { status: 500 });

  const row = (Array.isArray(data) ? data[0] : null) as GoRow | null;
  if (!row?.r2_key) return new NextResponse("not found", { status: 404 });

  await recordSiteAnalyticsEvent({
    request: req,
    eventType: "download",
    path: "/api/resources/go",
    resourceId: row.id,
  });

  try {
    const mod = await import("@aws-sdk/s3-request-presigner");
    const getSignedUrl: any = (mod as any).getSignedUrl;

    const client = s3();
    const Bucket = bucketForKey(row.r2_key);
    const Key = row.r2_key;

    const signed = await getSignedUrl(
      client,
      new GetObjectCommand({ Bucket, Key }),
      { expiresIn: 60 }
    );

    return NextResponse.redirect(signed, 302);
  } catch {
    try {
      const client = s3();
      const Bucket = bucketForKey(row.r2_key);
      const Key = row.r2_key;

      const out = await client.send(new GetObjectCommand({ Bucket, Key }));
      if (!out.Body) return new NextResponse("no body", { status: 502 });

      const headers = new Headers();
      headers.set("Content-Type", row.mime ?? "application/octet-stream");
      headers.set("Content-Disposition", contentDisposition(row.kind, row.original_filename));

      return new NextResponse(toWeb(out.Body) as any, { status: 200, headers });
    } catch (e: any) {
      return new NextResponse(String(e?.message ?? e), { status: 500 });
    }
  }
}

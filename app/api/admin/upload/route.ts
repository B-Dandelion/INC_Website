import { NextResponse } from "next/server";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { requireAdminOrThrow } from "@/lib/requireAdmin";

export const runtime = "nodejs";

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

function safeName(name: string) {
  return name.replace(/[^\w.\-]+/g, "_");
}

function isYmd(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function kstTodayYmd() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function youtubeVideoId(value: string) {
  const input = value.trim();
  if (!input) return null;

  try {
    const normalized = /^https?:\/\//i.test(input)
      ? input
      : `https://${input}`;
    const url = new URL(normalized);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();

    let id: string | null = null;

    if (host === "youtu.be") {
      id = url.pathname.split("/").filter(Boolean)[0] ?? null;
    } else if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com"
    ) {
      if (url.pathname === "/watch") {
        id = url.searchParams.get("v");
      } else {
        const match = url.pathname.match(
          /^\/(?:shorts|embed|live)\/([^/?#]+)/
        );
        id = match?.[1] ?? null;
      }
    }

    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

const MAX_FILE_BYTES = 200 * 1024 * 1024;

type Visibility = "public" | "member" | "admin";
const VIS_SET = new Set<Visibility>(["public", "member", "admin"]);

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

const sbAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false },
  }
);

const ISSUE_BOARDS = new Set(["atm", "heartbeat-of-atoms"]);

export async function POST(req: Request) {
  try {
    await requireAdminOrThrow();

    const form = await req.formData();
    const title = String(form.get("title") || "").trim();
    const boardSlug = String(form.get("boardSlug") || "").trim();
    const visibilityRaw = String(
      form.get("visibility") || "public"
    ).trim() as Visibility;
    const displayname = String(form.get("displayname") || "").trim();
    const publishedAtRaw = String(
      form.get("publishedAt") || ""
    ).trim();
    const note = String(form.get("note") || "").trim();
    const sourcePathRaw = String(form.get("source_path") || "").trim();
    const fileValue = form.get("file");
    const file =
      fileValue instanceof File && fileValue.size > 0
        ? fileValue
        : null;

    if (!title) {
      return NextResponse.json(
        { ok: false, error: "title is required" },
        { status: 400 }
      );
    }

    if (!boardSlug) {
      return NextResponse.json(
        { ok: false, error: "boardSlug is required" },
        { status: 400 }
      );
    }

    if (!VIS_SET.has(visibilityRaw)) {
      return NextResponse.json(
        { ok: false, error: "invalid visibility" },
        { status: 400 }
      );
    }

    const videoId = sourcePathRaw
      ? youtubeVideoId(sourcePathRaw)
      : null;

    if (sourcePathRaw && !videoId) {
      return NextResponse.json(
        { ok: false, error: "invalid YouTube URL" },
        { status: 400 }
      );
    }

    if (!file && !videoId) {
      return NextResponse.json(
        { ok: false, error: "file or YouTube URL is required" },
        { status: 400 }
      );
    }

    if (file && file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        {
          ok: false,
          error: `file too large (max ${MAX_FILE_BYTES} bytes)`,
        },
        { status: 413 }
      );
    }

    const fileKind = file
      ? inferKindFromFileName(file.name)
      : null;

    if (file && !fileKind) {
      return NextResponse.json(
        { ok: false, error: "unsupported file type" },
        { status: 400 }
      );
    }

    const { data: board, error: boardErr } = await sbAdmin
      .from("boards")
      .select("id")
      .eq("slug", boardSlug)
      .maybeSingle();

    if (boardErr || !board) {
      return NextResponse.json(
        {
          ok: false,
          error: "invalid boardSlug",
          detail: boardErr?.message,
        },
        { status: 400 }
      );
    }

    const postedAt = kstTodayYmd();
    const publishedAt = ISSUE_BOARDS.has(boardSlug)
      ? isYmd(publishedAtRaw)
        ? publishedAtRaw
        : ""
      : postedAt;

    if (ISSUE_BOARDS.has(boardSlug) && !publishedAt) {
      return NextResponse.json(
        {
          ok: false,
          error: "publishedAt is required for ATM/Heartbeat",
        },
        { status: 400 }
      );
    }

    let kind: string;
    let r2Key: string;
    let mime: string | null;
    let sizeBytes: number;
    let originalFilename: string;
    let sourcePath: string | null;

    if (videoId) {
      kind = "video";
      r2Key = `${boardSlug}/external/youtube/${Date.now()}-${videoId}.url`;
      mime = "text/uri-list";
      sizeBytes = 0;
      originalFilename = `youtube-${videoId}.url`;
      sourcePath = `https://www.youtube.com/watch?v=${videoId}`;
    } else {
      const uploadedFile = file!;
      kind = fileKind!;
      r2Key = `${boardSlug}/${Date.now()}-${safeName(
        uploadedFile.name
      )}`;
      const buffer = Buffer.from(
        await uploadedFile.arrayBuffer()
      );

      const bucket =
        visibilityRaw === "public"
          ? process.env.R2_PUBLIC_BUCKET!
          : process.env.R2_PRIVATE_BUCKET!;

      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: r2Key,
          Body: buffer,
          ContentType:
            uploadedFile.type || "application/octet-stream",
        })
      );

      mime = uploadedFile.type || null;
      sizeBytes = buffer.length;
      originalFilename = uploadedFile.name;
      sourcePath = null;
    }

    const { data: inserted, error: insertError } = await sbAdmin
      .from("resources")
      .insert({
        board_id: board.id,
        title,
        kind,
        posted_at: postedAt,
        published_at: publishedAt,
        displayname: displayname || null,
        visibility: visibilityRaw,
        r2_key: r2Key,
        mime,
        size_bytes: sizeBytes,
        original_filename: originalFilename,
        note: note || null,
        source_path: sourcePath,
      })
      .select(
        "id,title,board_id,kind,posted_at,published_at,r2_key,original_filename,visibility,source_path"
      )
      .maybeSingle();

    if (insertError || !inserted) {
      if (file && r2Key) {
        const rollbackBucket =
          visibilityRaw === "public"
            ? process.env.R2_PUBLIC_BUCKET!
            : process.env.R2_PRIVATE_BUCKET!;

        await s3
          .send(
            new DeleteObjectCommand({
              Bucket: rollbackBucket,
              Key: r2Key,
            })
          )
          .catch(() => null);
      }

      return NextResponse.json(
        {
          ok: false,
          error: "db insert failed",
          detail: insertError?.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      resource: inserted,
    });
  } catch (e: any) {
    const status = e?.status ?? 500;

    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status }
    );
  }
}

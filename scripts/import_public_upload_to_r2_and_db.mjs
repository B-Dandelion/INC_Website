// scripts/import_public_upload_to_r2_and_db.mjs
import dotenv from "dotenv";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

// node 스크립트에서도 Next.js env 파일(.env.local 등)을 읽게 함
const cwd = process.cwd();
const candidates = [".env.local", ".local.env", ".env"];

let loaded = false;
for (const name of candidates) {
  const p = path.join(cwd, name);
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    console.log(`[env] loaded ${name}`);
    loaded = true;
    break;
  }
}
if (!loaded) console.warn("[env] no env file found (.env.local / .local.env / .env)");

// ---------------------------
// CLI args (no deps)
// ---------------------------
function getArg(name, fallback = null) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return fallback;
  const v = process.argv[idx + 1];
  if (!v || v.startsWith("--")) return fallback;
  return v;
}
function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}
const BUCKET_MODE = (getArg("bucket") || "").toLowerCase(); // "public" | "private" | ""
if (BUCKET_MODE && !["public", "private"].includes(BUCKET_MODE)) {
  console.error("[arg] --bucket must be public|private");
  process.exit(1);
}

const ROOT = getArg("root") || "C:\\Users\\User\\Documents\\INC resource\\_public_upload";
const COMMIT = hasFlag("commit");          // 없으면 dry-run
const LIMIT = Number(getArg("limit") || "0"); // 0이면 무제한
const VISIBILITY = (getArg("visibility") || "public").toLowerCase(); // public|member|admin
const R2_PREFIX = (getArg("r2Prefix") || "inc-public").replace(/^\/+|\/+$/g, "");

// ---------------------------
// env validate
// ---------------------------
const needEnv = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_PUBLIC_BUCKET",
  "R2_PRIVATE_BUCKET",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];
const missing = needEnv.filter((k) => !process.env[k]);
if (missing.length) {
  console.error("[env] missing:", missing);
  process.exit(1);
}

if (!["public", "member", "admin"].includes(VISIBILITY)) {
  console.error("[arg] --visibility must be public|member|admin");
  process.exit(1);
}

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const resolvedBucketMode =
  BUCKET_MODE ||
  (VISIBILITY === "public" ? "public" : "private"); // visibility 기반 자동선택

const R2_BUCKET =
  resolvedBucketMode === "public"
    ? process.env.R2_PUBLIC_BUCKET
    : process.env.R2_PRIVATE_BUCKET;

if (!R2_BUCKET) {
  console.error(`[env] missing bucket for mode=${resolvedBucketMode}`);
  process.exit(1);
}
console.log(`[r2] bucketMode=${resolvedBucketMode} bucket=${R2_BUCKET}`);

// ---------------------------
// helpers
// ---------------------------
function extKind(fileName) {
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  if (["pdf"].includes(ext)) return "pdf";
  if (["jpg", "jpeg", "png", "webp"].includes(ext)) return "image";
  if (["ppt", "pptx"].includes(ext)) return "ppt";
  if (["doc", "docx"].includes(ext)) return "doc";
  if (["hwp", "hwpx"].includes(ext)) return "hwp";
  if (["zip"].includes(ext)) return "zip";
  if (["mp4", "mov", "m4v", "avi"].includes(ext)) return "video";
  return "file";
}

function safeAsciiBase(nameNoExt) {
  // 한글 등 비ASCII는 제거(키에 직접 넣지 않기)
  const s = nameNoExt
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]+/g, "")   // remove non-ascii
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return s.length ? s : "file";
}

function inferPublishedAtFromName(name) {
  // 1) YYYY-MM-DD or YYYY MM DD
  let m = name.match(/(20\d{2})[-_.\s](0?[1-9]|1[0-2])[-_.\s](0?[1-9]|[12]\d|3[01])/);
  if (m) {
    const y = m[1], mo = String(m[2]).padStart(2, "0"), d = String(m[3]).padStart(2, "0");
    return `${y}-${mo}-${d}`;
  }

  // 2) YYYY MON DD (JAN..DEC)
  const monthMap = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };
  m = name.match(/(20\d{2})\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*(\d{1,2})/i);
  if (m) {
    const y = m[1], mo = monthMap[m[2].toLowerCase()], d = String(m[3]).padStart(2, "0");
    return `${y}-${mo}-${d}`;
  }

  // 3) YYYY n월 n일
  m = name.match(/(20\d{2})\s*(\d{1,2})월\s*(\d{1,2})일?/);
  if (m) {
    const y = m[1], mo = String(m[2]).padStart(2, "0"), d = String(m[3]).padStart(2, "0");
    return `${y}-${mo}-${d}`;
  }

  // 4) YYYY n월 (day unknown) -> YYYY-MM-01
  m = name.match(/(20\d{2})\s*(\d{1,2})월/);
  if (m) {
    const y = m[1], mo = String(m[2]).padStart(2, "0");
    return `${y}-${mo}-01`;
  }

  // 5) YYYY MON (day unknown) -> YYYY-MM-01
  m = name.match(/(20\d{2})\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\b/i);
  if (m) {
    const y = m[1], mo = monthMap[m[2].toLowerCase()];
    return `${y}-${mo}-01`;
  }

  return null;
}

async function walkFiles(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    const ents = await fsp.readdir(cur, { withFileTypes: true });
    for (const e of ents) {
      const full = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.isFile()) out.push(full);
    }
  }
  return out;
}

async function loadBoardsMap() {
  const { data, error } = await supabaseAdmin.from("boards").select("id,slug");
  if (error) throw new Error(`[supabase] boards load failed: ${error.message}`);
  const map = new Map();
  for (const row of data || []) map.set(row.slug, row.id);
  return map;
}

async function existsResourceByKey(r2_key) {
  const { data, error } = await supabaseAdmin
    .from("resources")
    .select("id")
    .eq("r2_key", r2_key)
    .maybeSingle();
  if (error) throw new Error(`[supabase] exists check failed: ${error.message}`);
  return !!data?.id;
}

async function uploadToR2(localPath, key, contentType) {
  const body = fs.createReadStream(localPath);
  const cmd = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType || "application/octet-stream",
  });
  await r2.send(cmd);
}

function guessContentTypeByExt(filePath) {
  const ext = (filePath.split(".").pop() || "").toLowerCase();
  const map = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    hwp: "application/octet-stream",
    hwpx: "application/octet-stream",
    zip: "application/zip",
    mp4: "video/mp4",
    mov: "video/quicktime",
  };
  return map[ext] || "application/octet-stream";
}

// ---------------------------
// main
// ---------------------------
(async () => {
  console.log(`[boot] ROOT=${ROOT}`);
  console.log(`[mode] commit=${COMMIT} visibility=${VISIBILITY} r2Prefix=${R2_PREFIX}`);

  const boardsMap = await loadBoardsMap();

  const filesAll = await walkFiles(ROOT);
  const files = LIMIT > 0 ? filesAll.slice(0, LIMIT) : filesAll;
  console.log(`[scan] files=${files.length}`);

  let ok = 0, skipped = 0, failed = 0;

  for (const full of files) {
    const rel = path.relative(ROOT, full);
    const parts = rel.split(path.sep);
    const top = parts[0]; // board slug should be top-level folder

    const boardSlug = top;
    const boardId = boardsMap.get(boardSlug);

    if (!boardId) {
      console.warn(`[skip] unknown boardSlug='${boardSlug}' rel='${rel}'`);
      skipped++;
      continue;
    }

    const base = path.basename(full);
    const ext = (base.split(".").pop() || "").toLowerCase();
    const nameNoExt = base.replace(/\.[^/.]+$/, "");
    const kind = extKind(base);

    // R2 key = inc-public/<boardSlug>/<hash>_<safeBase>.<ext>
    const hash = crypto.createHash("sha1").update(rel).digest("hex").slice(0, 16);
    const safeBase = safeAsciiBase(nameNoExt);
    const key = `${R2_PREFIX}/${boardSlug}/${hash}_${safeBase}${ext ? "." + ext : ""}`;

    const subdir = parts.slice(1, -1).join("/"); // 한글 포함 가능 (note로 저장)
    const note = subdir ? `folder: ${subdir}` : "";
    const published_at = inferPublishedAtFromName(base) || null;
    const contentType = guessContentTypeByExt(full);

    if (!COMMIT) {
      console.log(`[dry] ${rel} -> key=${key} board=${boardSlug} kind=${kind} published_at=${published_at ?? "null"}`);
      ok++;
      continue;
    }

    try {
      // idempotent: if same key already exists, skip
      const exists = await existsResourceByKey(key);
      if (exists) {
        console.log(`[skip] exists r2_key=${key}`);
        skipped++;
        continue;
      }

      await uploadToR2(full, key, contentType);

      // Insert row
      const payload = {
        board_id: boardId,
        title: nameNoExt,                 // 기본 타이틀 (원하면 나중에 수정)
        kind,
        note,
        published_at,                     // 추정 불가면 null
        visibility: VISIBILITY,
        r2_key: key,
        original_filename: base,          // 컬럼 없으면 여기서 에러날 수 있음(아래 안내 참고)
      };

      const { data, error } = await supabaseAdmin
        .from("resources")
        .insert(payload)
        .select("id")
        .single();

      if (error) throw new Error(error.message);

      console.log(`[ok] id=${data.id} rel=${rel}`);
      ok++;
    } catch (e) {
      console.error(`[fail] rel=${rel} err=${e?.message || e}`);
      failed++;
    }
  }

  console.log(`[done] ok=${ok} skipped=${skipped} failed=${failed} commit=${COMMIT}`);
})();

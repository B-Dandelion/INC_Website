// scripts/import_public_upload_to_r2_and_db.v2.mjs
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

// -------------------- env --------------------
dotenv.config({ path: ".env.local" });
dotenv.config(); // fallback

// -------------------- args --------------------
function getArg(name, def = undefined) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return def;
  const v = process.argv[idx + 1];
  if (!v || v.startsWith("--")) return def;
  return v;
}
function hasFlag(name) {
  return process.argv.includes(name);
}

const ROOT = getArg("--root");
if (!ROOT) {
  console.error(
    'Usage: node scripts/import_public_upload_to_r2_and_db.v2.mjs --root "C:\\path\\to\\_public_upload" [--commit] [--bucket public|private] [--visibility public|member|admin]'
  );
  process.exit(1);
}

const COMMIT = hasFlag("--commit");
const BUCKET_MODE = (getArg("--bucket", "public") || "public").toLowerCase();
const VISIBILITY = (getArg("--visibility", "public") || "public").toLowerCase();

const missing = [];
for (const k of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
  if (!process.env[k]) missing.push(k);
}
if (BUCKET_MODE === "public" && !process.env.R2_PUBLIC_BUCKET) missing.push("R2_PUBLIC_BUCKET");
if (BUCKET_MODE === "private" && !process.env.R2_PRIVATE_BUCKET) missing.push("R2_PRIVATE_BUCKET");
if (missing.length) {
  console.error("[env] missing:", missing);
  process.exit(1);
}

const bucket = BUCKET_MODE === "public" ? process.env.R2_PUBLIC_BUCKET : process.env.R2_PRIVATE_BUCKET;
// DB r2_key prefix (기존 스타일 유지)
const r2Prefix = BUCKET_MODE === "public" ? "inc-public" : "inc-private";

console.log(`[boot] ROOT=${ROOT}`);
console.log(`[mode] commit=${COMMIT} bucketMode=${BUCKET_MODE} bucket=${bucket} r2Prefix=${r2Prefix} visibility=${VISIBILITY}`);

// -------------------- helpers --------------------
function slugifyBaseName(s) {
  const nfkd = (s || "").normalize("NFKD");
  const ascii = nfkd.replace(/[\u0300-\u036f]/g, "");
  let out = ascii.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (!out) out = "file";
  return out.slice(0, 120);
}

// resources.kind enum: pdf | image | video | post | slide | doc | zip | link
function extKindByFileName(fileName) {
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  if (ext === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "webp", "gif", "bmp"].includes(ext)) return "image";
  if (["mp4", "mov", "webm"].includes(ext)) return "video";
  if (["ppt", "pptx", "key"].includes(ext)) return "slide";
  if (["doc", "docx", "hwp", "hwpx", "txt", "rtf", "xls", "xlsx"].includes(ext)) return "doc";
  if (["zip", "7z", "rar"].includes(ext)) return "zip";
  return "doc";
}

function guessMime(ext) {
  const e = (ext || "").toLowerCase();
  if (e === "pdf") return "application/pdf";
  if (e === "jpg" || e === "jpeg") return "image/jpeg";
  if (e === "png") return "image/png";
  if (e === "webp") return "image/webp";
  if (e === "gif") return "image/gif";
  if (e === "bmp") return "image/bmp";
  if (e === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (e === "doc") return "application/msword";
  if (e === "pptx") return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  if (e === "ppt") return "application/vnd.ms-powerpoint";
  if (e === "hwp") return "application/x-hwp";
  if (e === "hwpx") return "application/vnd.hancom.hwpx";
  if (e === "xls") return "application/vnd.ms-excel";
  if (e === "xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (e === "zip") return "application/zip";
  if (e === "mp4") return "video/mp4";
  if (e === "mov") return "video/quicktime";
  if (e === "webm") return "video/webm";
  return "application/octet-stream";
}

function fmtLocalDateYYYYMMDD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isValidYMD(y, m, d) {
  if (y < 1970 || y > 2100) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

// 경로/파일명에서 날짜 추정(없으면 null)
function parsePublishedAtFromText(text) {
  const s = text;

  // 13-digit epoch millis
  {
    const m = s.match(/\b(\d{13})\b/);
    if (m) {
      const ms = Number(m[1]);
      if (Number.isFinite(ms)) {
        const d = new Date(ms);
        if (!Number.isNaN(d.getTime())) return fmtLocalDateYYYYMMDD(d);
      }
    }
  }

  // YYYYMMDD
  {
    const m = s.match(/\b(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\b/);
    if (m) {
      const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
      if (isValidYMD(y, mo, d)) return `${m[1]}-${m[2]}-${m[3]}`;
    }
  }

  // YYYY[-_. ]MM[-_. ]DD
  {
    const m = s.match(/\b(20\d{2})[-_.\s](0?[1-9]|1[0-2])[-_.\s](0?[1-9]|[12]\d|3[01])\b/);
    if (m) {
      const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
      if (isValidYMD(y, mo, d)) {
        return `${String(y)}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      }
    }
  }

  // YY.MM.DD
  {
    const m = s.match(/\b(\d{2})\.(\d{2})\.(\d{2})\b/);
    if (m) {
      const y = 2000 + Number(m[1]);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      if (isValidYMD(y, mo, d)) return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  // YYMMDD (오탐 방지: 구분자/괄호 주변만 허용)
  {
    const m = s.match(/(?:\(|_|-|\s)(\d{2})(\d{2})(\d{2})(?:\)|_|-|\s)/);
    if (m) {
      const y = 2000 + Number(m[1]);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      if (isValidYMD(y, mo, d)) return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  // "2025 JUN 10"
  {
    const m = s.match(/\b(20\d{2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{1,2})\b/i);
    if (m) {
      const y = Number(m[1]);
      const monMap = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
      const mo = monMap[m[2].toLowerCase()];
      const d = Number(m[3]);
      if (isValidYMD(y, mo, d)) return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  // "2025 7월" (day 없으면 01)
  {
    const m = s.match(/\b(20\d{2})\s*(\d{1,2})월\b/);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]);
      if (isValidYMD(y, mo, 1)) return `${y}-${String(mo).padStart(2, "0")}-01`;
    }
  }

  // year만 있으면 01-01
  {
    const m = s.match(/\b(20\d{2})\b/);
    if (m) return `${Number(m[1])}-01-01`;
  }

  return null;
}

async function walkFiles(rootDir) {
  const out = [];
  async function walk(dir) {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.name.startsWith(".")) continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) await walk(full);
      else if (ent.isFile()) {
        const n = ent.name.toLowerCase();
        if (n === "thumbs.db" || n === "desktop.ini") continue;
        out.push(full);
      }
    }
  }
  await walk(rootDir);
  return out;
}

// 파일 내용 sha256 해시(16)
async function sha256_16_file(filePath) {
  return await new Promise((resolve, reject) => {
    const h = crypto.createHash("sha256");
    const s = fs.createReadStream(filePath);
    s.on("data", (chunk) => h.update(chunk));
    s.on("error", reject);
    s.on("end", () => resolve(h.digest("hex").slice(0, 16)));
  });
}

// -------------------- clients --------------------
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// -------------------- boards cache + ensure --------------------
const BOARD_TITLE_MAP = {
  atm: "ATM",
  "heartbeat-of-atoms": "Heartbeat of Atoms",
  contribution: "기고문",
  "expert-opinion-report": "전문가의견보고서",
  lecture: "강연자료",
  workshop: "워크샵",
  seminar: "세미나",
  "misc-reports": "기타 보고서",
  "midterm-report": "중간보고회",
  "essay-contest": "에세이 경진대회",
  "shortform-contest": "숏폼 공모전",
};

const boardIdBySlug = new Map();

// preload existing boards
{
  const { data: boards, error: boardsErr } = await supabase.from("boards").select("id,slug");
  if (boardsErr) {
    console.error("[db] failed to load boards:", boardsErr.message || boardsErr);
    process.exit(1);
  }
  for (const b of boards || []) boardIdBySlug.set(b.slug, b.id);
}

// boards 자동 생성
async function ensureBoardId(boardSlug) {
  const cached = boardIdBySlug.get(boardSlug);
  if (cached) return cached;

  const { data: found, error: fErr } = await supabase
    .from("boards")
    .select("id,slug")
    .eq("slug", boardSlug)
    .maybeSingle();

  if (fErr) throw new Error(fErr.message || String(fErr));
  if (found?.id) {
    boardIdBySlug.set(boardSlug, found.id);
    return found.id;
  }

  const title = BOARD_TITLE_MAP[boardSlug] ?? boardSlug;

  if (!COMMIT) {
    console.log(`[dry] would create board slug=${boardSlug} title=${title}`);
    return null;
  }

  const { data: created, error: cErr } = await supabase
    .from("boards")
    .insert({
      slug: boardSlug,
      title,
      visibility_default: "public",
      sort_order: 0,
    })
    .select("id")
    .single();

  if (cErr) throw new Error(cErr.message || String(cErr));
  boardIdBySlug.set(boardSlug, created.id);
  console.log(`[board] created slug=${boardSlug} id=${created.id}`);
  return created.id;
}

// “옛날 방식 row(size_bytes null)”까지 잡기 위한 중복 탐지:
// 같은 board_id + original_filename 후보들을 가져와서,
// (1) size_bytes가 있으면 비교
// (2) size_bytes가 없으면 R2 Head로 ContentLength 비교
async function findDuplicateByNameAndSize({ boardId, boardSlug, originalFilename, sizeBytes }) {
  const { data: candidates, error } = await supabase
    .from("resources")
    .select("id,r2_key,size_bytes,deleted_at")
    .eq("board_id", boardId)
    .eq("original_filename", originalFilename)
    .is("deleted_at", null)
    .limit(20);

  if (error) throw new Error(error.message || String(error));
  if (!candidates || candidates.length === 0) return null;

  for (const c of candidates) {
    if (typeof c.size_bytes === "number" && c.size_bytes === sizeBytes) return c;

    // DB에 size가 없으면 R2에서 확인
    if (c.size_bytes == null && typeof c.r2_key === "string") {
      // 다른 prefix(inc-private)까지 섞이면 bucket이 달라질 수 있어서, 현재 prefix만 검사
      if (!c.r2_key.startsWith(`${r2Prefix}/${boardSlug}/`)) continue;
      try {
        const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: c.r2_key }));
        const len = Number(head?.ContentLength);
        if (Number.isFinite(len) && len === sizeBytes) return c;
      } catch (_) {
        // head 실패면 비교 불가 -> 무시
      }
    }
  }
  return null;
}

// -------------------- run --------------------
const absRoot = path.resolve(ROOT);
const files = await walkFiles(absRoot);
console.log(`[scan] files=${files.length}`);

let ok = 0, skipped = 0, failed = 0, updated = 0;

for (const abs of files) {
  const rel = path.relative(absRoot, abs);
  const source_path = rel.split(path.sep).join("/"); // 원본 경로 저장용
  const parts = rel.split(path.sep);
  const boardSlug = parts[0];

  // ensure board exists
  let boardId = null;
  try {
    boardId = await ensureBoardId(boardSlug);
  } catch (e) {
    console.log(`[fail] rel=${rel} err=ensureBoardId ${String(e?.message || e)}`);
    failed++;
    continue;
  }

  const stat = await fsp.stat(abs);
  const originalFilename = path.basename(abs);
  const ext = (path.extname(originalFilename).slice(1) || "").toLowerCase();
  const base = originalFilename.slice(0, originalFilename.length - (ext ? ext.length + 1 : 0));

  const safeBase = slugifyBaseName(base);
  const safeName = ext ? `${safeBase}.${ext}` : safeBase;

  // content-hash 기반 key
  let hash16 = "";
  try {
    hash16 = await sha256_16_file(abs);
  } catch (e) {
    console.log(`[fail] rel=${rel} err=hash ${String(e?.message || e)}`);
    failed++;
    continue;
  }

  const key = `${r2Prefix}/${boardSlug}/${hash16}_${safeName}`;
  const kind = extKindByFileName(originalFilename);

  const parsed = parsePublishedAtFromText(source_path);
  const published_at = parsed ?? fmtLocalDateYYYYMMDD(new Date(stat.mtimeMs));
  const title = base.trim() || originalFilename;

  if (!COMMIT) {
    console.log(`[dry] ${source_path} -> key=${key} board=${boardSlug} kind=${kind} published_at=${published_at}`);
    ok++;
    continue;
  }

  if (!boardId) {
    console.log(`[skip] rel=${rel} reason=boardId_null boardSlug=${boardSlug}`);
    skipped++;
    continue;
  }

  try {
    // 1) r2_key 동일 row 있으면: 스킵이 아니라 source_path/mime/size_bytes 백필(update)
    {
      const { data: existing, error: exErr } = await supabase
        .from("resources")
        .select("id,source_path,mime,size_bytes")
        .eq("r2_key", key)
        .limit(1);

      if (exErr) throw new Error(exErr.message || String(exErr));
      if (existing && existing.length > 0) {
        const row = existing[0];
        const patch = {};
        if (!row.source_path) patch.source_path = source_path;
        if (!row.mime) patch.mime = guessMime(ext);
        if (row.size_bytes == null) patch.size_bytes = stat.size;

        if (Object.keys(patch).length > 0) {
          patch.updated_at = new Date().toISOString();
          const { error: upErr } = await supabase.from("resources").update(patch).eq("id", row.id);
          if (upErr) throw new Error(upErr.message || String(upErr));
          console.log(`[upd] id=${row.id} rel=${rel}`);
          updated++;
        } else {
          console.log(`[skip] id=${row.id} rel=${rel} (already in DB by r2_key)`);
          skipped++;
        }
        continue;
      }
    }

    // 2) 옛날 key 규칙으로 이미 DB에 올라간 “같은 파일” 중복 방지 (filename+real-size)
    const dup = await findDuplicateByNameAndSize({
      boardId,
      boardSlug,
      originalFilename,
      sizeBytes: stat.size,
    });
    if (dup) {
      console.log(`[skip] id=${dup.id} rel=${rel} (duplicate by original_filename+size)`);
      skipped++;
      continue;
    }

    // 3) R2 존재 체크 → 없으면 업로드
    let existsInR2 = false;
    try {
      await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      existsInR2 = true;
    } catch (_) {}

    if (!existsInR2) {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: fs.createReadStream(abs),
          ContentType: guessMime(ext),
        })
      );
    }

    // 4) insert
    const payload = {
      board_id: boardId,
      title,
      kind,
      published_at,
      visibility: VISIBILITY,
      r2_key: key,
      mime: guessMime(ext),
      size_bytes: stat.size,
      original_filename: originalFilename,
      source_path, // 추가
      note: null,
    };

    const { data: ins, error: insErr } = await supabase
      .from("resources")
      .insert(payload)
      .select("id")
      .single();

    if (insErr) throw new Error(insErr.message || String(insErr));
    console.log(`[ok] id=${ins.id} rel=${rel}`);
    ok++;
  } catch (e) {
    console.log(`[fail] rel=${rel} err=${String(e?.message || e)}`);
    failed++;
  }
}

console.log(`[done] ok=${ok} updated=${updated} skipped=${skipped} failed=${failed} commit=${COMMIT}`);

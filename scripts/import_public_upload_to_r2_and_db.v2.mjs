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

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

const R2_PUBLIC_BUCKET = process.env.R2_PUBLIC_BUCKET;
const R2_PRIVATE_BUCKET = process.env.R2_PRIVATE_BUCKET;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const missing = [];
for (const k of [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
]) {
  if (!process.env[k]) missing.push(k);
}
if (BUCKET_MODE === "public" && !R2_PUBLIC_BUCKET) missing.push("R2_PUBLIC_BUCKET");
if (BUCKET_MODE === "private" && !R2_PRIVATE_BUCKET) missing.push("R2_PRIVATE_BUCKET");
if (missing.length) {
  console.error("[env] missing:", missing);
  process.exit(1);
}

const bucket = BUCKET_MODE === "public" ? R2_PUBLIC_BUCKET : R2_PRIVATE_BUCKET;
// DB r2_key prefix (기존 스타일 유지)
const r2Prefix = BUCKET_MODE === "public" ? "inc-public" : "inc-private";

console.log(`[boot] ROOT=${ROOT}`);
console.log(
  `[mode] commit=${COMMIT} bucketMode=${BUCKET_MODE} bucket=${bucket} r2Prefix=${r2Prefix} visibility=${VISIBILITY}`
);

// -------------------- helpers --------------------
function slugifyBaseName(s) {
  const nfkd = (s || "").normalize("NFKD");
  const ascii = nfkd.replace(/[\u0300-\u036f]/g, ""); // diacritics 제거
  let out = ascii.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (!out) out = "file";
  return out.slice(0, 120);
}

function extKindByFileName(fileName) {
  const ext = (fileName.split(".").pop() || "").toLowerCase();

  // resources.kind enum: pdf | image | video | post | slide | doc | zip | link
  if (ext === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "webp", "gif", "bmp"].includes(ext)) return "image";
  if (["mp4", "mov", "webm"].includes(ext)) return "video";

  // ppt/hwp “금지 아님” -> enum에는 slide/doc로 넣어야 함
  if (["ppt", "pptx", "key"].includes(ext)) return "slide";
  if (["doc", "docx", "hwp", "hwpx", "txt", "rtf", "xls", "xlsx"].includes(ext))
    return "doc";

  if (["zip", "7z", "rar"].includes(ext)) return "zip";

  // 애매하면 doc으로
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
  if (e === "docx")
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (e === "doc") return "application/msword";
  if (e === "pptx")
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  if (e === "ppt") return "application/vnd.ms-powerpoint";
  if (e === "hwp") return "application/x-hwp";
  if (e === "hwpx") return "application/vnd.hancom.hwpx";
  if (e === "xls") return "application/vnd.ms-excel";
  if (e === "xlsx")
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
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

  // 13-digit epoch millis: 1757668665291.jpg 같은 거
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
      const y = Number(m[1]),
        mo = Number(m[2]),
        d = Number(m[3]);
      if (isValidYMD(y, mo, d)) return `${m[1]}-${m[2]}-${m[3]}`;
    }
  }

  // YYYY[-_. ]MM[-_. ]DD
  {
    const m = s.match(
      /\b(20\d{2})[-_.\s](0?[1-9]|1[0-2])[-_.\s](0?[1-9]|[12]\d|3[01])\b/
    );
    if (m) {
      const y = Number(m[1]),
        mo = Number(m[2]),
        d = Number(m[3]);
      if (isValidYMD(y, mo, d)) {
        return `${String(y)}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      }
    }
  }

  // YY.MM.DD  (ex: 25.11.18-07.jpg => 2025-11-18)
  {
    const m = s.match(/\b(\d{2})\.(\d{2})\.(\d{2})\b/);
    if (m) {
      const y = 2000 + Number(m[1]);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      if (isValidYMD(y, mo, d)) return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  // YYMMDD (ex: (250117) => 2025-01-17)
  // ⚠️ 오탐 방지하려고 괄호/구분자 없으면 너무 쉽게 걸릴 수 있음 -> 괄호/언더스코어/공백 주변만 허용
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
      const monMap = {
        jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
        jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
      };
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

  // year만 있으면 01-01 (최후의 추정)
  {
    const m = s.match(/\b(20\d{2})\b/);
    if (m) {
      const y = Number(m[1]);
      return `${y}-01-01`;
    }
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

// ✅ PATCH 2: 파일 내용 sha256 해시(중복 방지 키 안정화)
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
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
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
  const { data: boards, error: boardsErr } = await supabase
    .from("boards")
    .select("id,slug");

  if (boardsErr) {
    console.error("[db] failed to load boards:", boardsErr.message || boardsErr);
    process.exit(1);
  }
  for (const b of boards || []) boardIdBySlug.set(b.slug, b.id);
}

// ✅ PATCH 1: boards 자동 생성
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
      visibility_default: "public", // boards default
      sort_order: 0,
    })
    .select("id")
    .single();

  if (cErr) throw new Error(cErr.message || String(cErr));
  boardIdBySlug.set(boardSlug, created.id);
  console.log(`[board] created slug=${boardSlug} id=${created.id}`);
  return created.id;
}

// -------------------- run --------------------
const absRoot = path.resolve(ROOT);
const files = await walkFiles(absRoot);
console.log(`[scan] files=${files.length}`);

let ok = 0,
  skipped = 0,
  failed = 0;

for (const abs of files) {
  const rel = path.relative(absRoot, abs);
  const parts = rel.split(path.sep);
  const boardSlug = parts[0];

  // ensure board exists (or log in dry)
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

  // ✅ PATCH 2: content-hash 기반 key
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

  // published_at은 반드시 채움 (추정 → mtime fallback)
  const parsed = parsePublishedAtFromText(rel);
  const published_at = parsed ?? fmtLocalDateYYYYMMDD(new Date(stat.mtimeMs));

  const title = base.trim() || originalFilename;

  if (!COMMIT) {
    console.log(
      `[dry] ${rel} -> key=${key} board=${boardSlug} kind=${kind} published_at=${published_at}`
    );
    ok++;
    continue;
  }

  // commit 모드인데 boardId가 null이면(이론상 거의 없음) 스킵
  if (!boardId) {
    console.log(`[skip] rel=${rel} reason=boardId_null boardSlug=${boardSlug}`);
    skipped++;
    continue;
  }

  try {
    // 1) r2_key로 idempotent 체크
    const { data: existingByKey, error: exErr } = await supabase
      .from("resources")
      .select("id")
      .eq("r2_key", key)
      .limit(1);

    if (exErr) throw new Error(exErr.message || String(exErr));
    if (existingByKey && existingByKey.length > 0) {
      console.log(`[skip] id=${existingByKey[0].id} rel=${rel} (already in DB by r2_key)`);
      skipped++;
      continue;
    }

    // ✅ PATCH 3: filename+size 기준 추가 중복 방지(예전 key 규칙으로 올라간 것까지 최대한 방지)
    const { data: dup, error: dupErr } = await supabase
      .from("resources")
      .select("id,r2_key")
      .eq("board_id", boardId)
      .eq("original_filename", originalFilename)
      .eq("size_bytes", stat.size)
      .is("deleted_at", null)
      .limit(1);

    if (dupErr) throw new Error(dupErr.message || String(dupErr));
    if (dup && dup.length > 0) {
      console.log(
        `[skip] id=${dup[0].id} rel=${rel} (same original_filename+size already in DB)`
      );
      skipped++;
      continue;
    }

    // 2) R2 존재 체크 → 없으면 업로드
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

    // 3) insert
    const payload = {
      board_id: boardId,
      title,
      kind,
      published_at, // NOT NULL
      visibility: VISIBILITY,
      r2_key: key,
      mime: guessMime(ext),
      size_bytes: stat.size,
      original_filename: originalFilename,
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

console.log(`[done] ok=${ok} skipped=${skipped} failed=${failed} commit=${COMMIT}`);
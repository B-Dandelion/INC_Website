// scripts/import_addition_atm_to_r2_and_db.mjs
import dotenv from "dotenv";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

// ---------------------------
// env load (.env.local -> .local.env -> .env)
// ---------------------------
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

const ROOT = getArg("root") || "/Users/minging/Downloads/addition";
const COMMIT = hasFlag("commit"); // 없으면 dry-run
const LIMIT = Number(getArg("limit") || "0"); // 0이면 무제한
const VISIBILITY = (getArg("visibility") || "public").toLowerCase(); // public|member|admin
const BUCKET_MODE = (getArg("bucket") || "").toLowerCase(); // public|private|""
const R2_PREFIX = (getArg("r2Prefix") || "inc-public").replace(/^\/+|\/+$/g, "");

const BOARD_DEFAULT = (getArg("board") || "atm").toLowerCase(); // ATM 추가 업로드 기본
const META_PATH = getArg("meta") || ""; // optional JSON metadata mapping
const DEDUPE_BY_NAME = hasFlag("dedupeByName"); // optional: board_id + original_filename 기준 중복 방지
const CHECKSUM = hasFlag("checksum"); // optional: sha256 계산(조금 느림)

if (!["public", "member", "admin"].includes(VISIBILITY)) {
  console.error("[arg] --visibility must be public|member|admin");
  process.exit(1);
}
if (BUCKET_MODE && !["public", "private"].includes(BUCKET_MODE)) {
  console.error("[arg] --bucket must be public|private");
  process.exit(1);
}

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

const resolvedBucketMode = BUCKET_MODE || (VISIBILITY === "public" ? "public" : "private");
const R2_BUCKET =
  resolvedBucketMode === "public" ? process.env.R2_PUBLIC_BUCKET : process.env.R2_PRIVATE_BUCKET;

if (!R2_BUCKET) {
  console.error(`[env] missing bucket for mode=${resolvedBucketMode}`);
  process.exit(1);
}
console.log(`[r2] bucketMode=${resolvedBucketMode} bucket=${R2_BUCKET}`);

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
  const s = nameNoExt
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]+/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return s.length ? s : "file";
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
    m4v: "video/x-m4v",
    avi: "video/x-msvideo",
  };
  return map[ext] || "application/octet-stream";
}

function inferPublishedAtFromName(name) {
  // 1) YYYY-MM-DD / YYYY_MM_DD / YYYY.MM.DD / YYYY MM DD
  let m = name.match(/(20\d{2})[-_.\s]*(0?[1-9]|1[0-2])[-_.\s]*(0?[1-9]|[12]\d|3[01])/);
  if (m) {
    const y = m[1],
      mo = String(m[2]).padStart(2, "0"),
      d = String(m[3]).padStart(2, "0");
    return `${y}-${mo}-${d}`;
  }

  // 2) YYYY MON DD (JAN..DEC) with separators
  const monthMap = {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    may: "05",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12",
  };
  m = name.match(/(20\d{2})[-_.\s]*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[-_.\s]*(\d{1,2})/i);
  if (m) {
    const y = m[1],
      mo = monthMap[m[2].toLowerCase()],
      d = String(m[3]).padStart(2, "0");
    return `${y}-${mo}-${d}`;
  }

  // 3) YYYY n월 n일
  m = name.match(/(20\d{2})\s*(\d{1,2})월\s*(\d{1,2})일?/);
  if (m) {
    const y = m[1],
      mo = String(m[2]).padStart(2, "0"),
      d = String(m[3]).padStart(2, "0");
    return `${y}-${mo}-${d}`;
  }

  // 4) YYYY n월 (day unknown) -> YYYY-MM-01
  m = name.match(/(20\d{2})\s*(\d{1,2})월/);
  if (m) {
    const y = m[1],
      mo = String(m[2]).padStart(2, "0");
    return `${y}-${mo}-01`;
  }

  // 5) YYYY MON (day unknown) -> YYYY-MM-01
  m = name.match(/(20\d{2})[-_.\s]*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\b/i);
  if (m) {
    const y = m[1],
      mo = monthMap[m[2].toLowerCase()];
    return `${y}-${mo}-01`;
  }

  return null;
}

function inferIssueNoFromName(name) {
  // e.g., ATM_No_177_..., No-177, NO177
  const m = name.match(/\b(?:NO|No|no)[-_.\s]*([0-9]{1,4})\b/);
  if (m) return Number(m[1]);
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
  for (const row of data || []) map.set(String(row.slug).toLowerCase(), row.id);
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

async function existsResourceByName(boardId, originalFilename) {
  // 컬럼 없으면 에러 날 수 있는데, 그 경우는 "중복체크 불가"로 보고 false 처리
  try {
    const { data, error } = await supabaseAdmin
      .from("resources")
      .select("id")
      .eq("board_id", boardId)
      .eq("original_filename", originalFilename)
      .maybeSingle();
    if (error) throw error;
    return !!data?.id;
  } catch {
    return false;
  }
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

async function readMetaJson(metaPath) {
  if (!metaPath) return new Map();
  const abs = path.isAbsolute(metaPath) ? metaPath : path.join(cwd, metaPath);
  if (!fs.existsSync(abs)) throw new Error(`[meta] not found: ${abs}`);
  const raw = await fsp.readFile(abs, "utf-8");
  const obj = JSON.parse(raw);

  // 지원 형태:
  // 1) { "ATM_No_177_2025_DEC_19.pdf": { title: "...", published_at: "...", ... } }
  // 2) { "atm/ATM_No_177_2025_DEC_19.pdf": { ... } }
  // 3) { "files": [ { file: "...", ...fields } ] }
  const map = new Map();
  if (Array.isArray(obj?.files)) {
    for (const row of obj.files) {
      const k = String(row.file || row.filename || "").trim();
      if (!k) continue;
      const { file, filename, ...rest } = row;
      map.set(k, rest);
    }
  } else {
    for (const [k, v] of Object.entries(obj)) map.set(String(k), v);
  }
  console.log(`[meta] loaded entries=${map.size} from ${abs}`);
  return map;
}

function parseUnknownColumnFromErrorMessage(msg) {
  // PostgREST 흔한 패턴들:
  // - Could not find the 'xxx' column of 'resources' in the schema cache
  // - column "xxx" of relation "resources" does not exist
  // - column resources.xxx does not exist
  const m1 = msg.match(/Could not find the '([^']+)' column/i);
  if (m1) return m1[1];
  const m2 = msg.match(/column\s+"([^"]+)"\s+of\s+relation/i);
  if (m2) return m2[1];
  const m3 = msg.match(/column\s+resources\.([a-zA-Z0-9_]+)\s+does not exist/i);
  if (m3) return m3[1];
  return null;
}

async function insertWithAutoDropUnknownColumns(payload) {
  // v2 컬럼 넣어도, DB에 없으면 자동으로 빼고 재시도
  let cur = { ...payload };
  for (let attempt = 1; attempt <= 6; attempt++) {
    const { data, error } = await supabaseAdmin.from("resources").insert(cur).select("id").single();
    if (!error) return { id: data.id, dropped: [] };

    const msg = error.message || String(error);
    const col = parseUnknownColumnFromErrorMessage(msg);
    if (col && Object.prototype.hasOwnProperty.call(cur, col)) {
      console.warn(`[schema] drop unknown column '${col}' then retry (attempt=${attempt})`);
      delete cur[col];
      continue;
    }
    // 알 수 없는 에러면 그대로 던짐
    throw new Error(msg);
  }
  throw new Error("[schema] too many retries while dropping unknown columns");
}

async function sha256File(filePath) {
  const h = crypto.createHash("sha256");
  const stream = fs.createReadStream(filePath);
  await new Promise((resolve, reject) => {
    stream.on("data", (d) => h.update(d));
    stream.on("end", resolve);
    stream.on("error", reject);
  });
  return h.digest("hex");
}

// ---------------------------
// main
// ---------------------------
(async () => {
  console.log(`[boot] ROOT=${ROOT}`);
  console.log(`[mode] commit=${COMMIT} visibility=${VISIBILITY} r2Prefix=${R2_PREFIX}`);
  console.log(`[opt] boardDefault=${BOARD_DEFAULT} dedupeByName=${DEDUPE_BY_NAME} checksum=${CHECKSUM}`);

  const boardsMap = await loadBoardsMap();
  const metaMap = await readMetaJson(META_PATH);

  const filesAll = await walkFiles(ROOT);

  // junk 파일 제외
  const filtered = filesAll.filter((p) => {
    const b = path.basename(p);
    if (b === ".DS_Store") return false;
    if (b.toLowerCase() === "thumbs.db") return false;
    if (b.startsWith("~$")) return false;
    return true;
  });

  const files = LIMIT > 0 ? filtered.slice(0, LIMIT) : filtered;
  console.log(`[scan] files=${files.length}`);

  let ok = 0,
    skipped = 0,
    failed = 0;

  for (const full of files) {
    const rel = path.relative(ROOT, full);
    const parts = rel.split(path.sep).filter(Boolean);

    // boardSlug 결정:
    // - 파일이 ROOT 바로 아래면: 기본값(atm) 사용
    // - 하위 폴더면: 최상위 폴더를 slug로 보고, 없으면 기본값
    const boardSlug = (parts.length >= 2 ? parts[0] : BOARD_DEFAULT).toLowerCase();
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

    // OS에 따라 \ / 차이로 해시가 달라지는 문제 방지: rel을 posix로 정규화해서 해시
    const relPosix = parts.join("/");

    // meta 키 조회 우선순위: (1) relPosix (2) base
    const meta = metaMap.get(relPosix) || metaMap.get(base) || null;

    const published_at = (meta?.published_at ?? inferPublishedAtFromName(base)) || null;
    const issue_no = (meta?.issue_no ?? inferIssueNoFromName(base)) ?? null;

    const safeBase = safeAsciiBase(meta?.title ? String(meta.title) : nameNoExt);
    const hashSeed = `${boardSlug}/${relPosix}`; // 안정적(구조 기반)
    const hash = crypto.createHash("sha1").update(hashSeed).digest("hex").slice(0, 16);

    const key = `${R2_PREFIX}/${boardSlug}/${hash}_${safeBase}${ext ? "." + ext : ""}`;

    const subdir = parts.length >= 2 ? parts.slice(1, -1).join("/") : parts.slice(0, -1).join("/");
    const noteBase = subdir ? `folder: ${subdir}` : "";
    const note = [noteBase, meta?.note].filter(Boolean).join(" | ");

    const contentType = guessContentTypeByExt(full);
    const stat = await fsp.stat(full);
    const size_bytes = stat.size;

    if (!COMMIT) {
      console.log(
        `[dry] rel=${relPosix} -> key=${key} board=${boardSlug} kind=${kind} published_at=${
          published_at ?? "null"
        } issue_no=${issue_no ?? "null"} bytes=${size_bytes}`
      );
      ok++;
      continue;
    }

    try {
      // 1) r2_key 기준 중복 방지(기본)
      const existsKey = await existsResourceByKey(key);
      if (existsKey) {
        console.log(`[skip] exists r2_key=${key}`);
        skipped++;
        continue;
      }

      // 2) 옵션: original_filename 기준(같은 게시판 내) 중복 방지
      if (DEDUPE_BY_NAME) {
        const existsName = await existsResourceByName(boardId, base);
        if (existsName) {
          console.log(`[skip] exists by name board=${boardSlug} original_filename=${base}`);
          skipped++;
          continue;
        }
      }

      await uploadToR2(full, key, contentType);

      const checksum_sha256 = CHECKSUM ? await sha256File(full) : null;

      // v2에서 새로 쓰는 컬럼이 있어도, DB에 없으면 자동으로 빼고 insert 재시도함
      const payload = {
        board_id: boardId,
        title: meta?.title ?? nameNoExt,
        kind,
        note: note || null,
        published_at,
        visibility: meta?.visibility ?? VISIBILITY,
        r2_key: key,

        // (있으면 저장, 없으면 자동 drop)
        original_filename: base,
        source_relpath: relPosix,
        content_type: contentType,
        size_bytes,
        issue_no,
        checksum_sha256,
        import_tag: meta?.import_tag ?? "addition_atm",
      };

      // meta에서 임의 필드 추가(예: summary, authors, tags 등)
      // 단, DB에 없으면 자동 drop 됨
      if (meta && typeof meta === "object") {
        for (const [k, v] of Object.entries(meta)) {
          if (k === "published_at" || k === "title" || k === "note" || k === "visibility" || k === "issue_no") continue;
          payload[k] = v;
        }
      }

      const { id } = await insertWithAutoDropUnknownColumns(payload);

      console.log(`[ok] id=${id} rel=${relPosix}`);
      ok++;
    } catch (e) {
      console.error(`[fail] rel=${rel} err=${e?.message || e}`);
      failed++;
    }
  }

  console.log(`[done] ok=${ok} skipped=${skipped} failed=${failed} commit=${COMMIT}`);
})();

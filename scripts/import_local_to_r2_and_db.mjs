import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import mime from "mime-types";

// .env.local 강제 로드 (로그 끄고 싶으면 quiet: true)
dotenv.config({ path: ".env.local", quiet: true });

const {
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_PUBLIC_BUCKET,
    R2_PRIVATE_BUCKET,
    UPLOAD_ROOT,

    // optional
    DRY_RUN = "false",          // "true"면 업로드/DB 쓰기 없이 로그만
    BATCH_SIZE = "50",          // upsert 청크 사이즈
    STRICT_DATE = "false",      // "true"면 파일명에서 날짜 못 뽑으면 에러
} = process.env;

if (!R2_PUBLIC_BUCKET || !R2_PRIVATE_BUCKET) throw new Error("Missing R2 bucket env");
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing Supabase env");
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) throw new Error("Missing R2 env");
if (!UPLOAD_ROOT) throw new Error("Missing UPLOAD_ROOT");

const dryRun = DRY_RUN === "true";
const batchSize = Math.max(1, Number(BATCH_SIZE) || 50);
const strictDate = STRICT_DATE === "true";

console.log("[boot] start");
console.log("[boot] cwd=", process.cwd());
console.log("[boot] UPLOAD_ROOT=", UPLOAD_ROOT);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
});

const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

function walkFiles(dir) {
    const out = [];
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) out.push(...walkFiles(p));
        else out.push(p);
    }
    return out;
}

function safeKeyName(name) {
    return name
        .normalize("NFKD")
        .replace(/[^0-9A-Za-z가-힣.\-_()]+/g, "_")
        .replace(/_+/g, "_")
        .slice(0, 180);
}

function kindFromPath(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".pdf") return "pdf";
    if ([".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext)) return "image";
    if ([".mp4", ".mov", ".m4v"].includes(ext)) return "video";
    if ([".ppt", ".pptx", ".key"].includes(ext)) return "slide";
    if ([".zip", ".7z", ".rar"].includes(ext)) return "zip";
    return "doc";
}

function dateOnly(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

// 특수 공백/이상한 공백 정규화
function normalizeSpaces(s) {
    return (s || "")
        .normalize("NFKC")
        .replace(/\p{White_Space}+/gu, " ") // 유니코드 공백 전부
        .trim();
}

function extractDateFromFilename(filename) {
    const f = normalizeSpaces(filename);

    // 1) 2025-09-07 / 2025.09.07 / 2025_09_07
    let m = f.match(/(?:^|[^0-9])(20\d{2})\s*[-_.\/]\s*(\d{1,2})\s*[-_.\/]\s*(\d{1,2})(?=\D|$)/);
    if (m) {
        const y = m[1], mo = String(m[2]).padStart(2, "0"), d = String(m[3]).padStart(2, "0");
        return `${y}-${mo}-${d}`;
    }

    // 2) 2024 JAN 27 / 2025 APR 04 (앞에 숫자/EXTRA 있어도 됨+ SEPT 같은 변형도)
    m = f.match(/(?:^|[^0-9])(20\d{2})\s*[-_.]?\s*([A-Za-z]{3,4})\s*[-_.]?\s*(\d{1,2})(?=\D|$)/i);
    if (m) {
        const y = m[1];
        const monRaw = m[2].replace(/[^A-Za-z]/g, "").toUpperCase();
        const d = String(m[3]).padStart(2, "0");

        const map = {
            JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05",
            JUN: "06", JUNE: "06",
            JUL: "07", JULY: "07",
            AUG: "08",
            SEP: "09", SEPT: "09",
            OCT: "10", NOV: "11", DEC: "12",
        };

        const mo = map[monRaw];
        if (mo) return `${y}-${mo}-${d}`;
    }

    return null;
}

function buildTitleFromFilename(baseName) {
    // 목표: "24 KINGS ..." / "ATM No 004 ..." 스타일 유지
    // Version/Final 같은 잡음만 제거하고, EXTRA면 [추가] 부여
    const name = normalizeSpaces(baseName);

    // 24EXTRA 같은 케이스도 감지
    const isExtra =
        /\bEXTRA\b/i.test(baseName) ||
        /\b\d+EXTRA\b/i.test(baseName) ||
        /^\d+\s*EXTRA\b/i.test(baseName) ||
        /^\d+EXTRA\b/i.test(baseName);

    let t = name;

    // 24EXTRA -> 24 (EXTRA 제거)
    t = t.replace(/\b(\d+)EXTRA\b/gi, "$1");

    // 단독 EXTRA 토큰 제거
    t = t.replace(/\bEXTRA\b/gi, "");

    // Version / Final 류 제거 (텍스트만 깔끔하게)
    t = t.replace(/\bVersion\b\s*[0-9.]+[A-Za-z]?\b/gi, "");
    t = t.replace(/\bVer\.?\s*[0-9.]+[A-Za-z]?\b/gi, "");
    t = t.replace(/\bFinal\b/gi, "");
    t = t.replace(/_Final\b/gi, "");

    // 공백 정리
    t = t.replace(/[_]+/g, " ");
    t = t.replace(/\s{2,}/g, " ").trim();

    if (isExtra) t = `[추가] ${t}`;

    return t;
}

async function upsertChunk(rows) {
    if (rows.length === 0) return;
    if (dryRun) {
        console.log(`[dry-run] would upsert rows=${rows.length}`);
        return;
    }
    const { error } = await supabase.from("resources").upsert(rows, { onConflict: "r2_key" });
    if (error) throw error;
}

async function main() {
    const rootAbs = path.resolve(UPLOAD_ROOT);

    // boards slug -> { id, visibility_default }
    const { data: boards, error: bErr } = await supabase
        .from("boards")
        .select("id, slug, visibility_default");
    if (bErr) throw bErr;

    const boardMap = new Map((boards ?? []).map(b => [b.slug, { id: b.id, vis: b.visibility_default }]));

    const files = walkFiles(rootAbs);
    console.log(`[scan] files=${files.length} root=${rootAbs}`);
    console.log(`[mode] dryRun=${dryRun} batchSize=${batchSize} strictDate=${strictDate}`);

    let rows = [];
    let uploaded = 0;

    for (const abs of files) {
        const rel = path.relative(rootAbs, abs);
        const parts = rel.split(path.sep);
        const boardSlug = parts[0];

        const board = boardMap.get(boardSlug);
        if (!board) {
            console.warn(`[skip] unknown board slug=${boardSlug} (rename folder to match boards.slug) file=${rel}`);
            continue;
        }

        const stat = fs.statSync(abs);
        const base = path.basename(abs);
        const ext = path.extname(base);
        const baseNoExt = base.slice(0, base.length - ext.length);

        const extracted = extractDateFromFilename(baseNoExt);
        if (!extracted && strictDate) {
            throw new Error(`[strictDate] cannot extract date from filename: ${base}\nraw=${JSON.stringify(baseNoExt)}\nnorm=${JSON.stringify(normalizeSpaces(baseNoExt))}`);
        }

        const mimeType = mime.lookup(abs) || "application/octet-stream";
        const kind = kindFromPath(abs);
        const published_at = extracted ?? dateOnly(stat.mtime);

        const title = buildTitleFromFilename(baseNoExt);

        // r2_key: "<slug>/<fingerprint>-<safeFileName>"
        const fingerprint = crypto
            .createHash("sha1")
            .update(`${rel}|${stat.size}|${stat.mtimeMs}`)
            .digest("hex")
            .slice(0, 10);

        const r2_key = `${boardSlug}/${fingerprint}-${safeKeyName(base)}`.replaceAll("\\", "/");

        const bucket = (board.vis === "public") ? R2_PUBLIC_BUCKET : R2_PRIVATE_BUCKET;

        // 업로드
        if (!dryRun) {
            await s3.send(new PutObjectCommand({
                Bucket: bucket,
                Key: r2_key,
                Body: fs.createReadStream(abs),
                ContentType: String(mimeType),
            }));
        }

        uploaded += 1;

        // DB row 준비
        rows.push({
            board_id: board.id,
            title,
            kind,
            published_at,
            visibility: board.vis,  // boards.visibility_default 따라감
            r2_key,
            mime: String(mimeType),
            size_bytes: stat.size,
            original_filename: base,
            displayname: base,
            // note: 필요하면 여기 추가 가능 (nullable이면 안 넣어도 됨)
        });

        if (uploaded % 25 === 0) {
            console.log(`[progress] uploaded=${uploaded} prepared_in_batch=${rows.length}`);
        }

        // batch upsert
        if (rows.length >= batchSize) {
            console.log(`[db] upsert batch rows=${rows.length}`);
            await upsertChunk(rows);
            rows = [];
        }
    }

    // flush remaining
    if (rows.length > 0) {
        console.log(`[db] upsert final batch rows=${rows.length}`);
        await upsertChunk(rows);
    }

    console.log(`[done] processed=${uploaded}`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});

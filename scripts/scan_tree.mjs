// scripts/scan_tree.mjs
import { promises as fs } from "fs";
import path from "path";

const root = process.argv[2];
if (!root) {
  console.error("Usage: node scripts/scan_tree.mjs <folder>");
  process.exit(1);
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel = path.relative(root, full);
    if (e.isDirectory()) {
      out.push({ type: "dir", path: rel, children: await walk(full) });
    } else {
      const stat = await fs.stat(full);
      out.push({
        type: "file",
        path: rel,
        name: e.name,
        ext: path.extname(e.name).slice(1).toLowerCase(),
        size: stat.size,
        mtime: stat.mtime.toISOString(),
      });
    }
  }
  // 이름 정렬 (원하면 mtime/size로 바꿔도 됨)
  out.sort((a, b) => a.path.localeCompare(b.path));
  return out;
}

const tree = await walk(root);
console.log(JSON.stringify({ root, tree }, null, 2));
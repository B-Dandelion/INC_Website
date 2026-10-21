// Upload rules shared by the admin upload APIs and the browser uploader.
// Keep this file free of server-only imports.

export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

const KIND_BY_EXT: Record<string, string> = {
  pdf: "pdf",
  png: "image", jpg: "image", jpeg: "image", webp: "image", gif: "image",
  mp4: "video", mov: "video", webm: "video", mkv: "video",
  ppt: "slide", pptx: "slide", key: "slide",
  doc: "doc", docx: "doc", hwp: "doc", txt: "doc",
  zip: "zip", "7z": "zip", rar: "zip",
};

export const UPLOAD_ACCEPT = Object.keys(KIND_BY_EXT).map((ext) => `.${ext}`).join(",");

export function inferKindFromFileName(name: string): string | null {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return KIND_BY_EXT[ext] ?? null;
}

export function safeObjectName(name: string) {
  return name.replace(/[^\w.\-]+/g, "_");
}

export function isYmd(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function kstTodayYmd() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

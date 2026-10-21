// components/resources/events/shared.ts
// Small helpers shared by the five event boards.
import type { EventAssetRow } from "@/lib/eventsDb";

export function norm(s?: string | null) {
  return (s ?? "").trim().toLowerCase();
}

export function fmtPeriod(start?: string | null, end?: string | null) {
  if (!start) return "";
  return end && end !== start ? `${start} ~ ${end}` : start;
}

export function isImageAsset(asset: EventAssetRow | null | undefined) {
  const r = asset?.resources;
  if (!r) return false;
  if ((r.mime ?? "").startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|gif)$/i.test(r.original_filename ?? "");
}

export function isPdfAsset(asset: EventAssetRow | null | undefined) {
  const r = asset?.resources;
  return norm(r?.mime) === "application/pdf" || norm(r?.original_filename).endsWith(".pdf");
}

export function youtubeVideoId(value?: string | null) {
  const input = (value ?? "").trim();
  if (!input) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    let id: string | null = null;
    if (host === "youtu.be") id = url.pathname.split("/").filter(Boolean)[0] ?? null;
    else if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (url.pathname === "/watch") id = url.searchParams.get("v");
      else id = url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/)?.[1] ?? null;
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function awardRank(label?: string | null) {
  const order = ["대상", "금상", "은상", "동상", "장려상"];
  const i = order.indexOf((label ?? "").trim());
  return i < 0 ? 99 : i;
}

export function bySortOrder(a: EventAssetRow, b: EventAssetRow) {
  return (a.sort_order ?? 0) - (b.sort_order ?? 0);
}

// Upload names like "1737598868893 (1)", "#3" or "IMG_2034" say nothing to a reader.
export function meaningfulCaption(raw?: string | null) {
  const text = (raw ?? "").replace(/\.[a-z0-9]{2,5}$/i, "").trim();
  if (!text) return null;
  if (/^[#\d\s()_.-]+$/.test(text) || /^(img|dsc|kakaotalk|photo)[_\-\s]?\d/i.test(text)) return null;
  return text;
}

// Opening a file on purpose: counts as a view.
export function fileHref(id: number) {
  return `/api/resources/go?id=${id}`;
}

// Showing an image inside the page: resized, never counted as a view.
export function mediaSrc(id: number, w: 320 | 640 | 1280) {
  return `/api/resources/media?id=${id}&w=${w}`;
}

export function mediaSrcSet(id: number, widths: (320 | 640 | 1280)[]) {
  return widths.map((w) => `${mediaSrc(id, w)} ${w}w`).join(", ");
}

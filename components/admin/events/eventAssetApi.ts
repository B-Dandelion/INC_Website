// Event asset actions used by the event editor. Every call goes through
// postJson so an expired session sends the admin back to the login page.
import type { AssetSlot } from "@/lib/boardRules";
import { SessionExpired, postJson, uploadResource } from "../resources/uploadClient";
import { titleFromFileName } from "../resources/fileMeta";
import { goToAdminLogin } from "@/lib/adminNav";

export { SessionExpired };

export type ContestMeta = {
  person_ko: string;
  person_en: string;
  item_title_ko: string;
  item_title_en: string;
  award: string;
};

export const EMPTY_META: ContestMeta = { person_ko: "", person_en: "", item_title_ko: "", item_title_en: "", award: "" };

const clean = (v: string) => v.trim() || null;

// Only contest slots keep people; only award documents keep a work title and award.
export function metaPayload(slot: AssetSlot, meta: ContestMeta) {
  const person = Boolean(slot.contestMeta);
  const award = slot.role === "award_doc" && person;
  return {
    person_ko: person ? clean(meta.person_ko) : null,
    person_en: person ? clean(meta.person_en) : null,
    item_title_ko: award ? clean(meta.item_title_ko) : null,
    item_title_en: award ? clean(meta.item_title_en) : null,
    award: award ? clean(meta.award) : null,
  };
}

// The same checks the old single form made before attaching.
export function metaProblem(slot: AssetSlot, meta: ContestMeta) {
  if (!slot.contestMeta) return null;
  const hasPerson = Boolean(meta.person_ko.trim() || meta.person_en.trim());
  if (slot.role === "award_doc" && !hasPerson) return "수상자 이름(국문 또는 영문)을 입력하세요.";
  if (slot.role === "award_doc" && !meta.award.trim()) return "수상 등급을 입력하세요.";
  if (slot.role === "winner_photo" && !hasPerson) return "수상자 이름(국문 또는 영문)을 입력하세요.";
  return null;
}

export async function attach(eventId: string, slot: AssetSlot, resourceId: number, meta: ContestMeta, sortOrder: number) {
  return postJson("/api/admin/event-assets/add", {
    event_id: eventId,
    role: slot.role,
    resource_id: resourceId,
    sort_order: sortOrder,
    ...metaPayload(slot, meta),
  });
}

export async function uploadAndAttach(args: {
  boardSlug: string;
  eventId: string;
  slot: AssetSlot;
  file: File;
  title?: string;
  note?: string;
  meta: ContestMeta;
  sortOrder: number;
  onProgress?: (ratio: number) => void;
}) {
  const resourceId = await uploadResource({
    boardSlug: args.boardSlug,
    file: args.file,
    title: (args.title ?? "").trim() || titleFromFileName(args.file.name),
    note: args.note,
    visibility: "public",
    onProgress: args.onProgress,
  });
  await attach(args.eventId, args.slot, resourceId, args.meta, args.sortOrder);
  return resourceId;
}

// YouTube entries are stored as a resource whose source_path is the link.
export async function attachYoutube(args: { boardSlug: string; eventId: string; slot: AssetSlot; url: string; title: string; note?: string; meta: ContestMeta; sortOrder: number }) {
  const form = new FormData();
  form.set("title", args.title.trim());
  form.set("note", args.note ?? "");
  form.set("boardSlug", args.boardSlug);
  form.set("visibility", "public");
  form.set("source_path", args.url);
  const res = await fetch("/api/admin/upload", { method: "POST", body: form });
  if (res.status === 401) {
    goToAdminLogin();
    throw new SessionExpired();
  }
  const out = await res.json().catch(() => null);
  if (!res.ok || !out?.resource?.id) throw new Error(out?.error ?? `HTTP ${res.status}`);
  await attach(args.eventId, args.slot, out.resource.id, args.meta, args.sortOrder);
}

// Unlink from the event, then soft-delete the file itself (same as before).
export async function removeAsset(assetId: string, resourceId: number | null) {
  await postJson("/api/admin/event-assets/remove", { id: assetId });
  if (resourceId) await postJson("/api/admin/resources/delete", { resourceId });
}

export async function reorderAssets(eventId: string, role: string, ids: string[]) {
  return postJson("/api/admin/event-assets/reorder", { event_id: eventId, role, ids });
}

export async function updateAssetMeta(assetId: string, slot: AssetSlot, meta: ContestMeta) {
  return postJson("/api/admin/event-assets/update", { id: assetId, ...metaPayload(slot, meta) });
}

"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, ExternalLink, FileText, GripVertical, Link2, Loader2, Pencil, RefreshCw, Trash2, UploadCloud, X } from "lucide-react";
import type { AssetSlot } from "@/lib/boardRules";
import type { EventAssetRow } from "@/lib/eventsDb";
import { Button, Field, TextInput, cn } from "../ui";
import { useConfirm } from "../ui/ConfirmDialog";
import { useToast } from "../ui/Toast";
import { canonicalYoutubeUrl, isImageLike, youtubeVideoId } from "../eventDetail/helpers";
import { titleFromFileName } from "../resources/fileMeta";
import {
  EMPTY_META,
  SessionExpired,
  attachYoutube,
  metaProblem,
  removeAsset,
  reorderAssets,
  updateAssetMeta,
  uploadAndAttach,
  type ContestMeta,
} from "./eventAssetApi";

type Pending = { id: number; file: File; title: string; note: string; meta: ContestMeta; progress: number; state: "ready" | "uploading" | "error"; error?: string };

const IMAGE_ROLES = new Set(["photo", "winner_photo"]);

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function assetUrl(asset: EventAssetRow) {
  const r = asset.resources;
  if (!r) return null;
  return r.source_path && /^https?:\/\//.test(r.source_path) ? r.source_path : `/api/admin/resources/go?id=${r.id}`;
}

// What the public page shows for this asset, at admin scale.
function Preview({ asset, large }: { asset: EventAssetRow; large?: boolean }) {
  const r = asset.resources;
  if (!r) return <div className="grid h-full w-full place-items-center text-xs text-slate-500">파일 없음</div>;
  const yt = r.source_path ? youtubeVideoId(r.source_path) : null;
  if (yt) return <img src={`https://img.youtube.com/vi/${yt}/mqdefault.jpg`} alt="" className="h-full w-full object-cover" loading="lazy" />;
  if (isImageLike(r.mime, r.original_filename)) {
    return <img src={`/api/admin/resources/go?id=${r.id}`} alt="" className={cn("h-full w-full", large ? "object-contain" : "object-cover")} loading="lazy" decoding="async" />;
  }
  return (
    <div className="grid h-full w-full place-items-center gap-1 p-2 text-center text-slate-500">
      <FileText className="h-6 w-6" aria-hidden="true" />
      <span className="line-clamp-2 text-[11px]">{r.original_filename ?? r.title}</span>
    </div>
  );
}

function MetaFields({ slot, meta, onChange, disabled }: { slot: AssetSlot; meta: ContestMeta; onChange: (m: ContestMeta) => void; disabled?: boolean }) {
  if (!slot.contestMeta) return null;
  const set = (key: keyof ContestMeta) => (e: { target: { value: string } }) => onChange({ ...meta, [key]: e.target.value });
  return (
    <>
      <Field label={slot.role === "slide" ? "응모자(국문)" : "수상자(국문)"}>
        <TextInput value={meta.person_ko} onChange={set("person_ko")} disabled={disabled} />
      </Field>
      <Field label={slot.role === "slide" ? "응모자(영문)" : "수상자(영문)"}>
        <TextInput value={meta.person_en} onChange={set("person_en")} disabled={disabled} />
      </Field>
      {slot.role === "award_doc" ? (
        <>
          <Field label="수상 등급" required hint="예: 대상, 금상, 은상">
            <TextInput value={meta.award} onChange={set("award")} disabled={disabled} />
          </Field>
          <Field label="작품명(국문)">
            <TextInput value={meta.item_title_ko} onChange={set("item_title_ko")} disabled={disabled} />
          </Field>
          <Field label="작품명(영문)">
            <TextInput value={meta.item_title_en} onChange={set("item_title_en")} disabled={disabled} />
          </Field>
        </>
      ) : null}
    </>
  );
}

function metaOf(asset: EventAssetRow): ContestMeta {
  return {
    person_ko: asset.person_ko ?? "",
    person_en: asset.person_en ?? "",
    item_title_ko: asset.item_title_ko ?? "",
    item_title_en: asset.item_title_en ?? "",
    award: asset.award ?? "",
  };
}

function metaSummary(asset: EventAssetRow) {
  return [asset.award, asset.person_ko || asset.person_en, asset.item_title_ko || asset.item_title_en].filter(Boolean).join(" · ");
}

export default function SlotSection({
  slot,
  assets: serverAssets,
  boardSlug,
  eventId,
  allowYoutube,
}: {
  slot: AssetSlot;
  assets: EventAssetRow[];
  boardSlug: string;
  eventId: string;
  allowYoutube: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();

  // Local order so drags and deletes show at once; a refresh from the server wins.
  const [assets, setAssets] = useState(serverAssets);
  const [lastServer, setLastServer] = useState(serverAssets);
  if (serverAssets !== lastServer) {
    setLastServer(serverAssets);
    setAssets(serverAssets);
  }

  const [pending, setPending] = useState<Pending[]>([]);
  const [dragging, setDragging] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; meta: ContestMeta } | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [youtube, setYoutube] = useState({ url: "", title: "", meta: EMPTY_META });
  const [running, setRunning] = useState(false);
  const nextId = useRef(1);
  const fileInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const replaceTarget = useRef<EventAssetRow | null>(null);

  const isImageSlot = IMAGE_ROLES.has(slot.role);
  const nextSort = () => (assets.reduce((max, a) => Math.max(max, a.sort_order ?? 0), 0) || 0) + 10;

  function markBusy(id: string, on: boolean) {
    setBusyIds((cur) => {
      const next = new Set(cur);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function addFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (slot.single) {
      // A poster or timetable holds one file: the new one replaces the old.
      void uploadSingle(list[0]);
      return;
    }
    setPending((cur) => [
      ...cur,
      ...list.map((file) => ({ id: nextId.current++, file, title: titleFromFileName(file.name), note: "", meta: EMPTY_META, progress: 0, state: "ready" as const })),
    ]);
  }

  async function uploadSingle(file: File | undefined) {
    if (!file) return;
    const old = assets[0] ?? null;
    if (old) {
      const ok = await confirm({ title: `${slot.label}을(를) 바꿀까요?`, description: "지금 걸린 파일은 새 파일로 바뀌고 이전 파일은 삭제 처리됩니다.", confirmLabel: "바꾸기" });
      if (!ok) return;
    }
    const id = nextId.current++;
    setPending([{ id, file, title: titleFromFileName(file.name), note: "", meta: EMPTY_META, progress: 0, state: "uploading" }]);
    try {
      await uploadAndAttach({ boardSlug, eventId, slot, file, meta: EMPTY_META, sortOrder: 0, onProgress: (p) => setPending((cur) => cur.map((x) => (x.id === id ? { ...x, progress: p } : x))) });
      // The add API re-points a single slot; retire the old file.
      if (old?.resources?.id) await fetch("/api/admin/resources/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resourceId: old.resources.id }) });
      setPending([]);
      toast(`${slot.label}을(를) 올렸습니다.`, "success");
      router.refresh();
    } catch (error) {
      if (error instanceof SessionExpired) return;
      setPending((cur) => cur.map((x) => (x.id === id ? { ...x, state: "error", error: errorText(error) } : x)));
    }
  }

  async function uploadPending() {
    const queue = pending.filter((p) => p.state !== "uploading" && !metaProblem(slot, p.meta) && p.title.trim());
    if (!queue.length) return;
    setRunning(true);
    let sort = nextSort();
    let ok = 0;
    for (const item of queue) {
      setPending((cur) => cur.map((x) => (x.id === item.id ? { ...x, state: "uploading", error: undefined } : x)));
      try {
        await uploadAndAttach({
          boardSlug,
          eventId,
          slot,
          file: item.file,
          title: item.title,
          note: item.note,
          meta: item.meta,
          sortOrder: sort,
          onProgress: (p) => setPending((cur) => cur.map((x) => (x.id === item.id ? { ...x, progress: p } : x))),
        });
        sort += 10;
        ok++;
        setPending((cur) => cur.filter((x) => x.id !== item.id));
      } catch (error) {
        if (error instanceof SessionExpired) return;
        setPending((cur) => cur.map((x) => (x.id === item.id ? { ...x, state: "error", error: errorText(error) } : x)));
      }
    }
    setRunning(false);
    if (ok) {
      toast(`${slot.label} ${ok}개를 올렸습니다.`, "success");
      router.refresh();
    }
  }

  async function addYoutube() {
    const url = canonicalYoutubeUrl(youtube.url);
    if (!url) {
      toast("올바른 YouTube 링크를 입력하세요.", "error");
      return;
    }
    const problem = metaProblem(slot, youtube.meta);
    if (problem || !youtube.title.trim()) {
      toast(problem ?? "제목을 입력하세요.", "error");
      return;
    }
    setRunning(true);
    try {
      await attachYoutube({ boardSlug, eventId, slot, url, title: youtube.title, meta: youtube.meta, sortOrder: nextSort() });
      setYoutube({ url: "", title: "", meta: EMPTY_META });
      toast("링크를 연결했습니다.", "success");
      router.refresh();
    } catch (error) {
      if (!(error instanceof SessionExpired)) toast(`링크를 연결하지 못했습니다.\n${errorText(error)}`, "error");
    } finally {
      setRunning(false);
    }
  }

  async function remove(asset: EventAssetRow) {
    const name = asset.resources?.title ?? asset.resources?.original_filename ?? slot.label;
    const ok = await confirm({ title: `"${name}"을(를) 뺄까요?`, description: "행사에서 빠지고 파일은 삭제 처리됩니다. 공개 화면에서도 사라집니다.", confirmLabel: "삭제", tone: "danger" });
    if (!ok) return;
    const before = assets;
    setAssets((cur) => cur.filter((a) => a.id !== asset.id));
    try {
      await removeAsset(asset.id, asset.resources?.id ?? null);
      toast("삭제했습니다.", "success");
    } catch (error) {
      setAssets(before);
      if (!(error instanceof SessionExpired)) toast(`삭제하지 못했습니다. 되돌렸습니다.\n${errorText(error)}`, "error");
    }
  }

  // Replace keeps the slot, order and contest details: upload the new file,
  // attach it in the same place, then drop the old link and file.
  async function replace(asset: EventAssetRow, file: File) {
    markBusy(asset.id, true);
    try {
      await uploadAndAttach({ boardSlug, eventId, slot, file, title: asset.resources?.title ?? undefined, meta: metaOf(asset), sortOrder: asset.sort_order ?? 0 });
      if (!slot.single) await removeAsset(asset.id, asset.resources?.id ?? null);
      else if (asset.resources?.id) await fetch("/api/admin/resources/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resourceId: asset.resources.id }) });
      toast("파일을 바꿨습니다.", "success");
      router.refresh();
    } catch (error) {
      if (!(error instanceof SessionExpired)) toast(`파일을 바꾸지 못했습니다.\n${errorText(error)}`, "error");
    } finally {
      markBusy(asset.id, false);
    }
  }

  async function saveOrder(next: EventAssetRow[], before: EventAssetRow[]) {
    setAssets(next);
    try {
      await reorderAssets(eventId, slot.role, next.map((a) => a.id));
    } catch (error) {
      setAssets(before);
      if (!(error instanceof SessionExpired)) toast(`순서를 저장하지 못했습니다. 되돌렸습니다.\n${errorText(error)}`, "error");
    }
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= assets.length) return;
    const next = [...assets];
    [next[index], next[target]] = [next[target], next[index]];
    void saveOrder(next, assets);
  }

  // Drag reorder: the list follows the pointer, and the order is saved once on drop.
  const [dragStart, setDragStart] = useState<EventAssetRow[] | null>(null);
  function onItemDragOver(e: DragEvent, overId: string) {
    if (!dragId || dragId === overId) return;
    e.preventDefault();
    setAssets((cur) => {
      const from = cur.findIndex((a) => a.id === dragId);
      const to = cur.findIndex((a) => a.id === overId);
      if (from < 0 || to < 0) return cur;
      const next = [...cur];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }
  function onItemDragEnd() {
    if (dragStart && dragStart.map((a) => a.id).join() !== assets.map((a) => a.id).join()) void saveOrder(assets, dragStart);
    setDragId(null);
    setDragStart(null);
  }

  async function saveMeta() {
    if (!editing) return;
    const problem = metaProblem(slot, editing.meta);
    if (problem) {
      toast(problem, "error");
      return;
    }
    const { id, meta } = editing;
    const before = assets;
    setAssets((cur) => cur.map((a) => (a.id === id ? { ...a, ...Object.fromEntries(Object.entries(meta).map(([k, v]) => [k, v.trim() || null])) } : a)));
    setEditing(null);
    try {
      await updateAssetMeta(id, slot, meta);
      toast("저장했습니다.", "success");
    } catch (error) {
      setAssets(before);
      if (!(error instanceof SessionExpired)) toast(`저장하지 못했습니다. 되돌렸습니다.\n${errorText(error)}`, "error");
    }
  }

  function onZoneDrop(e: DragEvent) {
    // Ignore drops that are just reordering items.
    if (dragId) return;
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length && !running) addFiles(e.dataTransfer.files);
  }

  const actions = (asset: EventAssetRow, index: number): ReactNode => {
    const url = assetUrl(asset);
    const busy = busyIds.has(asset.id);
    return (
      <div className="flex items-center gap-0.5">
        {!slot.single ? (
          <>
            <IconBtn label="앞으로" onClick={() => move(index, -1)} disabled={index === 0 || busy}>
              <ChevronUp className="h-4 w-4" />
            </IconBtn>
            <IconBtn label="뒤로" onClick={() => move(index, 1)} disabled={index === assets.length - 1 || busy}>
              <ChevronDown className="h-4 w-4" />
            </IconBtn>
          </>
        ) : null}
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100" aria-label="새 창으로 열기" title="새 창으로 열기">
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : null}
        {slot.contestMeta ? (
          <IconBtn label="수상·응모 정보 고치기" onClick={() => setEditing({ id: asset.id, meta: metaOf(asset) })} disabled={busy}>
            <Pencil className="h-4 w-4" />
          </IconBtn>
        ) : null}
        <IconBtn
          label="파일 바꾸기"
          onClick={() => {
            replaceTarget.current = asset;
            replaceInput.current?.click();
          }}
          disabled={busy}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </IconBtn>
        <IconBtn label="삭제" onClick={() => remove(asset)} disabled={busy} danger>
          <Trash2 className="h-4 w-4" />
        </IconBtn>
      </div>
    );
  };

  const readyCount = pending.filter((p) => p.state !== "uploading" && !metaProblem(slot, p.meta) && p.title.trim()).length;

  return (
    <section className="border border-slate-200 bg-white" aria-labelledby={`slot-${slot.role}`}>
      <input
        ref={replaceInput}
        type="file"
        accept={slot.accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file && replaceTarget.current) void replace(replaceTarget.current, file);
        }}
      />
      <input
        ref={fileInput}
        type="file"
        accept={slot.accept}
        multiple={!slot.single}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <h3 id={`slot-${slot.role}`} className="text-[15px] font-semibold text-slate-900">
          {slot.label} <span className="ml-1 text-xs font-medium text-slate-500">{assets.length ? `${assets.length}개` : "비어 있음"}</span>
        </h3>
        <p className="text-xs text-slate-600">{slot.hint}</p>
      </header>

      <div className="p-4">
        {slot.single ? (
          assets[0] ? (
            <div className="grid gap-2">
              <div className="aspect-[3/4] max-h-[420px] w-full overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                <Preview asset={assets[0]} large />
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs text-slate-600">{assets[0].resources?.original_filename ?? assets[0].resources?.title}</p>
                {actions(assets[0], 0)}
              </div>
            </div>
          ) : null
        ) : assets.length ? (
          <ul className={cn(isImageSlot ? "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" : "divide-y divide-slate-100 border border-slate-100")}>
            {assets.map((asset, index) => (
              <li
                key={asset.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  setDragId(asset.id);
                  setDragStart(assets);
                }}
                onDragOver={(e) => onItemDragOver(e, asset.id)}
                onDragEnd={onItemDragEnd}
                className={cn("group bg-white", dragId === asset.id && "opacity-50", isImageSlot ? "grid gap-1.5" : "flex items-center gap-3 px-2 py-2")}
              >
                {isImageSlot ? (
                  <>
                    <div className="relative aspect-[4/3] overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                      <Preview asset={asset} />
                      <GripVertical className="absolute left-1 top-1 h-4 w-4 cursor-grab rounded bg-white/80 text-slate-600" aria-hidden="true" />
                    </div>
                    {metaSummary(asset) ? <p className="truncate text-xs font-medium text-slate-700">{metaSummary(asset)}</p> : null}
                    <div className="flex justify-end">{actions(asset, index)}</div>
                  </>
                ) : (
                  <>
                    <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-slate-400" aria-hidden="true" />
                    <span className="w-6 shrink-0 text-center text-xs tabular-nums text-slate-500">{index + 1}</span>
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded border border-slate-200 bg-slate-50">
                      <Preview asset={asset} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{asset.resources?.title ?? asset.resources?.original_filename ?? "자료"}</p>
                      {metaSummary(asset) ? <p className="truncate text-xs text-slate-600">{metaSummary(asset)}</p> : null}
                    </div>
                    {actions(asset, index)}
                  </>
                )}
                {editing?.id === asset.id ? (
                  <div className={cn("grid gap-2 rounded-md bg-[#F7FAFC] p-3 sm:grid-cols-2", !isImageSlot && "basis-full")}>
                    <MetaFields slot={slot} meta={editing.meta} onChange={(meta) => setEditing({ id: asset.id, meta })} />
                    <div className="flex justify-end gap-2 sm:col-span-2">
                      <Button size="sm" onClick={() => setEditing(null)}>
                        취소
                      </Button>
                      <Button size="sm" variant="primary" onClick={saveMeta}>
                        저장
                      </Button>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        {pending.length ? (
          <ul className="mt-3 grid gap-2">
            {pending.map((p) => {
              const problem = metaProblem(slot, p.meta) ?? (p.title.trim() ? null : "제목을 입력하세요.");
              const locked = p.state === "uploading";
              return (
                <li key={p.id} className={cn("border p-3", p.state === "error" ? "border-red-200" : "border-slate-200")}>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                    <span className="truncate">{p.file.name}</span>
                    {!locked && !slot.single ? (
                      <button type="button" onClick={() => setPending((cur) => cur.filter((x) => x.id !== p.id))} className="rounded p-1 hover:bg-slate-100" aria-label={`${p.file.name} 빼기`}>
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                  {!slot.single ? (
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <Field label="제목" required>
                        <TextInput value={p.title} disabled={locked} onChange={(e) => setPending((cur) => cur.map((x) => (x.id === p.id ? { ...x, title: e.target.value } : x)))} />
                      </Field>
                      <Field label="세부 내용 (선택)">
                        <TextInput value={p.note} disabled={locked} onChange={(e) => setPending((cur) => cur.map((x) => (x.id === p.id ? { ...x, note: e.target.value } : x)))} />
                      </Field>
                      <MetaFields slot={slot} meta={p.meta} disabled={locked} onChange={(meta) => setPending((cur) => cur.map((x) => (x.id === p.id ? { ...x, meta } : x)))} />
                    </div>
                  ) : null}
                  <div className="mt-2 text-xs">
                    {locked ? (
                      <div className="flex items-center gap-2">
                        <div role="progressbar" aria-label={`${p.file.name} 업로드`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p.progress * 100)} className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full bg-[#2B6CA3]" style={{ width: `${Math.round(p.progress * 100)}%` }} />
                        </div>
                        <span className="w-10 text-right tabular-nums text-slate-600">{Math.round(p.progress * 100)}%</span>
                      </div>
                    ) : p.state === "error" ? (
                      <span role="alert" className="text-red-700">
                        {p.error}
                      </span>
                    ) : problem ? (
                      <span className="text-amber-800">{problem}</span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}

        <div
          onDragOver={(e) => {
            if (dragId) return;
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onZoneDrop}
          className={cn(
            "mt-3 flex flex-wrap items-center justify-center gap-3 border-2 border-dashed px-4 py-5 text-center text-sm transition",
            dragging ? "border-[#2B6CA3] bg-[#EEF4FA]" : "border-slate-200",
          )}
        >
          <UploadCloud className="h-5 w-5 text-slate-500" aria-hidden="true" />
          <span className="text-slate-700">{slot.single ? (assets[0] ? "새 파일을 끌어 놓으면 바뀝니다" : "파일을 끌어 놓으세요") : "파일을 끌어 놓으세요 (여러 개 가능)"}</span>
          <Button size="sm" onClick={() => fileInput.current?.click()} disabled={running}>
            파일 선택
          </Button>
          {!slot.single && pending.length ? (
            <Button size="sm" variant="primary" onClick={uploadPending} disabled={running || readyCount === 0} icon={running ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : undefined}>
              {running ? "올리는 중…" : `${readyCount}개 올리기`}
            </Button>
          ) : null}
        </div>

        {allowYoutube ? (
          <details className="mt-3 border border-slate-200 px-3 py-2">
            <summary className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-slate-700">
              <Link2 className="h-4 w-4" aria-hidden="true" />
              YouTube 링크로 추가
            </summary>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Field label="YouTube 링크" required className="sm:col-span-2">
                <TextInput value={youtube.url} placeholder="https://www.youtube.com/watch?v=..." onChange={(e) => setYoutube({ ...youtube, url: e.target.value })} />
              </Field>
              <Field label="제목" required className="sm:col-span-2">
                <TextInput value={youtube.title} onChange={(e) => setYoutube({ ...youtube, title: e.target.value })} />
              </Field>
              <MetaFields slot={slot} meta={youtube.meta} onChange={(meta) => setYoutube({ ...youtube, meta })} />
              <div className="flex justify-end sm:col-span-2">
                <Button size="sm" variant="primary" onClick={addYoutube} disabled={running}>
                  링크 연결
                </Button>
              </div>
            </div>
          </details>
        ) : null}
      </div>
    </section>
  );
}

function IconBtn({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn("inline-flex h-8 w-8 items-center justify-center rounded-md transition disabled:cursor-not-allowed disabled:opacity-30", danger ? "text-red-700 hover:bg-red-50" : "text-slate-600 hover:bg-slate-100")}
    >
      {children}
    </button>
  );
}

"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import { CheckCircle2, CircleAlert, FileText, Film, Loader2, RotateCcw, UploadCloud, X } from "lucide-react";
import { VISIBILITIES } from "@/lib/resourceFilters";
import { MAX_UPLOAD_BYTES, UPLOAD_ACCEPT, inferKindFromFileName, isYmd } from "@/lib/uploadRules";
import { Button, ButtonLink, Field, Select, TextInput, cn } from "../ui";
import { useToast } from "../ui/Toast";
import { dateFromFileName, formatBytes, titleFromFileName } from "./fileMeta";
import { KIND_LABEL, VISIBILITY_LABEL } from "./labels";

type Visibility = (typeof VISIBILITIES)[number];
type Status = "ready" | "uploading" | "saving" | "done" | "error";

type Item = {
  id: number;
  file: File;
  kind: string | null;
  previewUrl: string | null;
  title: string;
  date: string;
  note: string;
  visibility: Visibility;
  status: Status;
  progress: number;
  error: string | null;
  resourceId: number | null;
};

// How many files go up at the same time.
const CONCURRENCY = 3;

class SessionExpired extends Error {}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (res.status === 401) {
    location.href = "/admin-x7k3p9?reason=session";
    throw new SessionExpired();
  }
  const out = await res.json().catch(() => null);
  if (!res.ok || !out?.ok) throw new Error(out?.error ?? `HTTP ${res.status}`);
  return out;
}

// fetch() cannot report upload progress, so the file itself goes up with XHR.
function putWithProgress(url: string, file: File, contentType: string, onProgress: (ratio: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`저장소 업로드 실패 (HTTP ${xhr.status})`)));
    xhr.onerror = () => reject(new Error("네트워크 오류로 업로드하지 못했습니다."));
    xhr.send(file);
  });
}

function problemOf(item: Item, isIssue: boolean) {
  if (!item.kind) return "지원하지 않는 파일 형식입니다.";
  if (item.file.size === 0) return "빈 파일입니다.";
  if (item.file.size > MAX_UPLOAD_BYTES) return "200MB를 넘는 파일은 올릴 수 없습니다.";
  if (!item.title.trim()) return "제목을 입력하세요.";
  if (isIssue && !isYmd(item.date)) return "발간일을 입력하세요.";
  return null;
}

export default function BulkUploader({ boardSlug, boardLabel, isIssue }: { boardSlug: string; boardLabel: string; isIssue: boolean }) {
  const toast = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [defaultVisibility, setDefaultVisibility] = useState<Visibility>("public");
  const [dragging, setDragging] = useState(false);
  const [running, setRunning] = useState(false);
  const nextId = useRef(1);
  const fileInput = useRef<HTMLInputElement>(null);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Free preview URLs when the page goes away.
  useEffect(() => () => itemsRef.current.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl)), []);

  // Warn before leaving while files are still going up.
  useEffect(() => {
    if (!running) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [running]);

  function addFiles(files: FileList | File[]) {
    const added: Item[] = Array.from(files).map((file) => {
      const kind = inferKindFromFileName(file.name);
      return {
        id: nextId.current++,
        file,
        kind,
        previewUrl: kind === "image" || kind === "video" ? URL.createObjectURL(file) : null,
        title: titleFromFileName(file.name),
        date: dateFromFileName(file.name),
        note: "",
        visibility: defaultVisibility,
        status: "ready",
        progress: 0,
        error: null,
        resourceId: null,
      };
    });
    if (added.length) setItems((current) => [...current, ...added]);
  }

  function update(id: number, patch: Partial<Item>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeItem(id: number) {
    setItems((current) => {
      const target = current.find((item) => item.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  }

  function applyVisibilityToAll(visibility: Visibility) {
    setDefaultVisibility(visibility);
    setItems((current) => current.map((item) => (item.status === "ready" || item.status === "error" ? { ...item, visibility } : item)));
  }

  async function uploadOne(item: Item) {
    const contentType = item.file.type || "application/octet-stream";
    update(item.id, { status: "uploading", progress: 0, error: null });
    try {
      const presigned = await postJson("/api/admin/resources/presign", {
        boardSlug,
        fileName: item.file.name,
        contentType,
        size: item.file.size,
        visibility: item.visibility,
      });
      await putWithProgress(presigned.uploadUrl, item.file, contentType, (ratio) => update(item.id, { progress: ratio }));
      update(item.id, { status: "saving", progress: 1 });
      const saved = await postJson("/api/admin/resources/finalize", {
        boardSlug,
        key: presigned.key,
        title: item.title.trim(),
        note: item.note,
        visibility: item.visibility,
        date: item.date,
        originalFilename: item.file.name,
      });
      update(item.id, { status: "done", resourceId: saved.id });
      return true;
    } catch (error) {
      if (error instanceof SessionExpired) throw error;
      update(item.id, { status: "error", error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  async function uploadAll() {
    const queue = items.filter((item) => (item.status === "ready" || item.status === "error") && !problemOf(item, isIssue));
    if (queue.length === 0) return;
    setRunning(true);
    let ok = 0;
    let failed = 0;
    try {
      const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
        for (let next = queue.shift(); next; next = queue.shift()) {
          if (await uploadOne(next)) ok++;
          else failed++;
        }
      });
      await Promise.all(workers);
    } catch (error) {
      if (error instanceof SessionExpired) return;
    } finally {
      setRunning(false);
    }
    if (failed === 0) toast(`${ok}개 자료를 올렸습니다.`, "success");
    else toast(`${ok}개는 올렸고 ${failed}개는 실패했습니다. 실패한 항목에서 다시 시도할 수 있습니다.`, "error");
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (!running && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }

  const pending = items.filter((item) => item.status === "ready" || item.status === "error");
  const blocked = pending.filter((item) => problemOf(item, isIssue));
  const doneCount = items.filter((item) => item.status === "done").length;
  const listHref = `/admin-x7k3p9/resources/${boardSlug}`;

  return (
    <div className="grid gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!running) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "grid justify-items-center gap-2 border-2 border-dashed px-6 py-10 text-center transition",
          dragging ? "border-[#2B6CA3] bg-[#EEF4FA]" : "border-slate-300 bg-white",
        )}
      >
        <UploadCloud className={cn("h-8 w-8", dragging ? "text-[#174A7E]" : "text-slate-500")} aria-hidden="true" />
        <p className="text-sm font-semibold text-slate-800">파일을 여기로 끌어 놓으세요</p>
        <p className="text-xs text-slate-600">여러 개를 한 번에 올릴 수 있습니다 · 파일당 최대 200MB · 제목과 날짜는 파일 이름에서 채워집니다</p>
        <Button size="sm" className="mt-2" onClick={() => fileInput.current?.click()} disabled={running}>
          파일 선택
        </Button>
        <input
          ref={fileInput}
          type="file"
          multiple
          accept={UPLOAD_ACCEPT}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {items.length > 0 ? (
        <div className="flex flex-wrap items-end justify-between gap-3 border border-slate-200 bg-white px-4 py-3">
          <Field label="공개 범위 (모든 대기 파일에 적용)" className="min-w-[220px]">
            <Select value={defaultVisibility} onChange={(e) => applyVisibilityToAll(e.target.value as Visibility)} disabled={running} className="h-10 py-0">
              {VISIBILITIES.map((v) => (
                <option key={v} value={v}>
                  {VISIBILITY_LABEL[v]}
                </option>
              ))}
            </Select>
          </Field>
          <p className="text-xs text-slate-600" aria-live="polite">
            {items.length}개 중 {doneCount}개 완료
            {blocked.length ? ` · 입력이 필요한 파일 ${blocked.length}개` : ""}
          </p>
        </div>
      ) : null}

      <ul className="grid gap-2">
        {items.map((item) => {
          const problem = problemOf(item, isIssue);
          const editable = (item.status === "ready" || item.status === "error") && !running;
          return (
            <li key={item.id} className={cn("border bg-white p-4", item.status === "error" ? "border-red-200" : item.status === "done" ? "border-emerald-200" : "border-slate-200")}>
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 text-slate-500">
                  {item.kind === "image" && item.previewUrl ? (
                    <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
                  ) : item.kind === "video" && item.previewUrl ? (
                    <video src={item.previewUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                  ) : item.kind === "video" ? (
                    <Film className="h-6 w-6" aria-hidden="true" />
                  ) : (
                    <FileText className="h-6 w-6" aria-hidden="true" />
                  )}
                </div>

                <div className="grid min-w-[240px] flex-1 gap-3 md:grid-cols-[1fr_160px_150px]">
                  <Field label="제목" required>
                    <TextInput value={item.title} disabled={!editable} onChange={(e) => update(item.id, { title: e.target.value })} />
                  </Field>
                  <Field label={isIssue ? "발간일" : "게시일"} required={isIssue} hint={isIssue ? undefined : "비우면 오늘"}>
                    <TextInput type="date" value={item.date} disabled={!editable} onChange={(e) => update(item.id, { date: e.target.value })} />
                  </Field>
                  <Field label="공개 범위">
                    <Select value={item.visibility} disabled={!editable} onChange={(e) => update(item.id, { visibility: e.target.value as Visibility })}>
                      {VISIBILITIES.map((v) => (
                        <option key={v} value={v}>
                          {VISIBILITY_LABEL[v]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="세부 내용 (선택)" className="md:col-span-3">
                    <TextInput value={item.note} disabled={!editable} onChange={(e) => update(item.id, { note: e.target.value })} />
                  </Field>
                  <p className="truncate text-xs text-slate-600 md:col-span-3" title={item.file.name}>
                    {item.file.name} · {formatBytes(item.file.size)} · {KIND_LABEL[item.kind ?? ""] ?? "알 수 없는 형식"}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  {item.status === "error" && !running ? (
                    <Button size="sm" onClick={() => uploadOne(item)} disabled={Boolean(problem)} icon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}>
                      다시 시도
                    </Button>
                  ) : null}
                  {editable ? (
                    <button type="button" onClick={() => removeItem(item.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100" aria-label={`${item.file.name} 목록에서 빼기`}>
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 min-h-5 text-xs">
                {item.status === "uploading" || item.status === "saving" ? (
                  <div className="flex items-center gap-3">
                    <div
                      role="progressbar"
                      aria-label={`${item.file.name} 업로드`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(item.progress * 100)}
                      className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"
                    >
                      <div className="h-full bg-[#2B6CA3] transition-[width]" style={{ width: `${Math.round(item.progress * 100)}%` }} />
                    </div>
                    <span className="inline-flex w-24 items-center gap-1 tabular-nums text-slate-600">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      {item.status === "saving" ? "등록 중" : `${Math.round(item.progress * 100)}%`}
                    </span>
                  </div>
                ) : item.status === "done" ? (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    올렸습니다
                  </span>
                ) : item.status === "error" ? (
                  <span role="alert" className="inline-flex items-center gap-1.5 font-medium text-red-700">
                    <CircleAlert className="h-4 w-4" aria-hidden="true" />
                    {item.error}
                  </span>
                ) : problem ? (
                  <span className="font-medium text-amber-800">{problem}</span>
                ) : (
                  <span className="text-slate-500">올릴 준비가 됐습니다</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-[#F6F7F9]/95 py-3 backdrop-blur">
        {doneCount > 0 && !running ? (
          <Link href={listHref} className="mr-auto text-sm font-semibold text-[#174A7E] hover:underline">
            {boardLabel} 목록에서 확인하기 →
          </Link>
        ) : null}
        <ButtonLink href={listHref}>{doneCount > 0 ? "목록으로" : "취소"}</ButtonLink>
        <Button
          variant="primary"
          onClick={uploadAll}
          disabled={running || pending.length - blocked.length === 0}
          icon={running ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <UploadCloud className="h-4 w-4" aria-hidden="true" />}
        >
          {running ? "올리는 중…" : `${pending.length - blocked.length}개 올리기`}
        </Button>
      </div>
    </div>
  );
}

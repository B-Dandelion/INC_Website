"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, FileArchive, FileText, Film, Image as ImageIcon, Pencil, Presentation, RefreshCw, Trash2 } from "lucide-react";
import type { AdminResourceRow } from "@/lib/adminResourcesDb";
import { ISSUE_BOARD_SLUGS, VISIBILITIES } from "@/lib/resourceFilters";
import { Button, EmptyState, Field, Select, TextArea, TextInput, cn } from "../ui";
import { useConfirm } from "../ui/ConfirmDialog";
import { useToast } from "../ui/Toast";
import { KIND_LABEL, VISIBILITY_LABEL } from "./labels";

export type ResourceListRow = Pick<
  AdminResourceRow,
  "id" | "title" | "kind" | "posted_at" | "published_at" | "original_filename" | "note" | "views_count" | "visibility"
>;

type Visibility = ResourceListRow["visibility"];
type Draft = { title: string; date: string; visibility: Visibility; note: string };

const MAX_REPLACE_BYTES = 200 * 1024 * 1024;

const KIND_ICON: Record<string, ReactNode> = {
  pdf: <FileText className="h-5 w-5" aria-hidden="true" />,
  doc: <FileText className="h-5 w-5" aria-hidden="true" />,
  slide: <Presentation className="h-5 w-5" aria-hidden="true" />,
  video: <Film className="h-5 w-5" aria-hidden="true" />,
  zip: <FileArchive className="h-5 w-5" aria-hidden="true" />,
  image: <ImageIcon className="h-5 w-5" aria-hidden="true" />,
};

const visibilityTone: Record<Visibility, string> = {
  public: "border-emerald-200 bg-emerald-50 text-emerald-800",
  member: "border-sky-200 bg-sky-50 text-sky-800",
  admin: "border-slate-300 bg-slate-100 text-slate-700",
};

class SessionExpired extends Error {}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return readResponse(res);
}

async function readResponse(res: Response) {
  if (res.status === 401) {
    location.href = "/admin-x7k3p9?reason=session";
    throw new SessionExpired();
  }
  const out = await res.json().catch(() => null);
  if (!res.ok || out?.ok === false) throw new Error(out?.error ?? `HTTP ${res.status}`);
  return out;
}

function Highlight({ text, term }: { text: string; term: string }) {
  if (!term) return <>{text}</>;
  const at = text.toLowerCase().indexOf(term.toLowerCase());
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded-sm bg-amber-100 px-0.5 text-inherit">{text.slice(at, at + term.length)}</mark>
      {text.slice(at + term.length)}
    </>
  );
}

function issueNumber(title: string) {
  const m = title.match(/\bNo\.?\s*(\d{1,4})\b/i);
  return m ? `No. ${m[1]}` : "";
}

export default function ResourceTable({ rows: serverRows, boardSlug, query }: { rows: ResourceListRow[]; boardSlug: string; query: string }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const isIssue = ISSUE_BOARD_SLUGS.has(boardSlug);
  const dateKey = isIssue ? "published_at" : "posted_at";

  // Local copy of the server rows so edits show up immediately (optimistic);
  // when the server sends a fresh list (filter, page, refresh) it wins.
  const [rows, setRows] = useState(serverRows);
  const [lastServerRows, setLastServerRows] = useState(serverRows);
  if (serverRows !== lastServerRows) {
    setLastServerRows(serverRows);
    setRows(serverRows);
  }

  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState<Set<number>>(new Set());
  const replaceInput = useRef<HTMLInputElement>(null);
  const replaceTarget = useRef<number | null>(null);

  function markBusy(id: number, on: boolean) {
    setBusy((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function patchRow(id: number, patch: Partial<ResourceListRow>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function fail(action: string, error: unknown) {
    if (error instanceof SessionExpired) return;
    toast(`${action}하지 못했습니다. 바뀐 내용은 되돌렸습니다.\n${error instanceof Error ? error.message : String(error)}`, "error");
  }

  function startEdit(row: ResourceListRow) {
    setEditingId(row.id);
    setDraft({ title: row.title ?? "", date: row[dateKey] ?? "", visibility: row.visibility, note: row.note ?? "" });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  async function saveEdit(event: FormEvent, row: ResourceListRow) {
    event.preventDefault();
    if (!draft) return;
    const title = draft.title.trim();
    if (!title) return;

    const before = row;
    const patch: Partial<ResourceListRow> = { title, visibility: draft.visibility, note: draft.note.trim() || null };
    if (draft.date) patch[dateKey] = draft.date;

    patchRow(row.id, patch);
    cancelEdit();
    markBusy(row.id, true);
    try {
      await postJson("/api/admin/resources/update", {
        resourceId: row.id,
        title,
        note: draft.note,
        visibility: draft.visibility,
        ...(draft.date ? { [dateKey]: draft.date } : {}),
      });
      toast("저장했습니다.", "success");
    } catch (error) {
      patchRow(row.id, before);
      fail("저장", error);
    } finally {
      markBusy(row.id, false);
    }
  }

  async function changeVisibility(row: ResourceListRow, visibility: Visibility) {
    if (visibility === row.visibility) return;
    const before = row.visibility;
    patchRow(row.id, { visibility });
    markBusy(row.id, true);
    try {
      await postJson("/api/admin/resources/update", { resourceId: row.id, visibility });
      toast(`공개 범위를 '${VISIBILITY_LABEL[visibility]}'(으)로 바꿨습니다.`, "success");
    } catch (error) {
      patchRow(row.id, { visibility: before });
      fail("공개 범위를 변경", error);
    } finally {
      markBusy(row.id, false);
    }
  }

  async function restore(row: ResourceListRow, index: number) {
    setRows((current) => {
      const next = [...current];
      next.splice(Math.min(index, next.length), 0, row);
      return next;
    });
    try {
      await postJson("/api/admin/resources/restore", { resourceId: row.id });
      toast("삭제를 취소했습니다.", "success");
    } catch (error) {
      setRows((current) => current.filter((r) => r.id !== row.id));
      if (!(error instanceof SessionExpired)) toast(`삭제를 취소하지 못했습니다.\n${error instanceof Error ? error.message : String(error)}`, "error");
    }
  }

  async function remove(row: ResourceListRow) {
    const ok = await confirm({
      title: "이 자료를 삭제할까요?",
      description: `"${row.title ?? row.original_filename ?? "자료"}"이(가) 공개 화면과 관리 목록에서 사라집니다. 바로 뒤에 나오는 알림에서 되돌릴 수 있습니다.`,
      confirmLabel: "삭제",
      tone: "danger",
    });
    if (!ok) return;

    const index = rows.findIndex((r) => r.id === row.id);
    setRows((current) => current.filter((r) => r.id !== row.id));
    try {
      await postJson("/api/admin/resources/delete", { resourceId: row.id });
      toast("삭제했습니다.", "info", { label: "되돌리기", onClick: () => restore(row, index) });
    } catch (error) {
      setRows((current) => {
        const next = [...current];
        next.splice(index, 0, row);
        return next;
      });
      fail("삭제", error);
    }
  }

  function pickReplacement(id: number) {
    replaceTarget.current = id;
    replaceInput.current?.click();
  }

  async function replaceFile(file: File) {
    const id = replaceTarget.current;
    if (id == null) return;
    if (file.size > MAX_REPLACE_BYTES) {
      toast("파일 크기는 200MB 이하여야 합니다.", "error");
      return;
    }
    const form = new FormData();
    form.set("resourceId", String(id));
    form.set("file", file);
    markBusy(id, true);
    try {
      const out = await readResponse(await fetch("/api/admin/resources/replace", { method: "POST", body: form }));
      toast(out?.cleanupWarning ? `파일을 교체했지만 이전 파일 정리 중 경고가 있습니다.\n${out.cleanupWarning}` : "파일을 교체했습니다.", out?.cleanupWarning ? "info" : "success");
      router.refresh();
    } catch (error) {
      if (!(error instanceof SessionExpired)) toast(`파일을 교체하지 못했습니다.\n${error instanceof Error ? error.message : String(error)}`, "error");
    } finally {
      markBusy(id, false);
    }
  }

  return (
    <div className="border border-slate-200 bg-white">
      <input
        ref={replaceInput}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void replaceFile(file);
        }}
      />
      {rows.length === 0 ? (
        <EmptyState
          title="이 페이지의 자료를 모두 삭제했습니다."
          action={
            <Button size="sm" onClick={() => router.refresh()}>
              목록 새로 고침
            </Button>
          }
        />
      ) : null}
      <ul className="divide-y divide-slate-100">
        {rows.map((row) => {
          const title = (row.title ?? "").trim() || row.original_filename || "제목 없음";
          const fileUrl = `/api/admin/resources/go?id=${row.id}`;
          const isBusy = busy.has(row.id);
          const issue = isIssue ? issueNumber(title) : "";

          if (editingId === row.id && draft) {
            return (
              <li key={row.id} className="bg-[#F7FAFC] px-4 py-4">
                <form
                  onSubmit={(e) => saveEdit(e, row)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") cancelEdit();
                  }}
                  className="grid gap-3 md:grid-cols-[1fr_170px_150px]"
                >
                  <Field label="제목" required error={draft.title.trim() ? undefined : "제목을 입력하세요."}>
                    <TextInput autoFocus value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                  </Field>
                  <Field label={isIssue ? "발간일" : "게시일"}>
                    <TextInput type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
                  </Field>
                  <Field label="공개 범위">
                    <Select value={draft.visibility} onChange={(e) => setDraft({ ...draft, visibility: e.target.value as Visibility })}>
                      {VISIBILITIES.map((v) => (
                        <option key={v} value={v}>
                          {VISIBILITY_LABEL[v]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="메모 (상세 내용)" className="md:col-span-3">
                    <TextArea rows={2} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
                  </Field>
                  <div className="flex flex-wrap items-center justify-end gap-2 md:col-span-3">
                    <span className="mr-auto text-xs text-slate-500">Enter 저장 · Esc 취소</span>
                    <Button onClick={cancelEdit}>취소</Button>
                    <Button type="submit" variant="primary" disabled={!draft.title.trim()}>
                      저장
                    </Button>
                  </div>
                </form>
              </li>
            );
          }

          return (
            <li key={row.id} className={cn("flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 transition", isBusy && "opacity-60")} aria-busy={isBusy || undefined}>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 text-slate-500">
                {row.kind === "image" ? (
                  <img src={fileUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                ) : (
                  (KIND_ICON[row.kind ?? ""] ?? <FileText className="h-5 w-5" aria-hidden="true" />)
                )}
              </div>

              <div className="min-w-[200px] flex-1">
                <div className="flex items-center gap-2">
                  {issue ? <span className="shrink-0 rounded bg-[#EEF4FA] px-1.5 py-0.5 text-[11px] font-bold text-[#174A7E]">{issue}</span> : null}
                  <p className="truncate text-sm font-semibold text-slate-900" title={title}>
                    <Highlight text={title} term={query} />
                  </p>
                </div>
                <p className="mt-1 truncate text-xs text-slate-600">
                  {isIssue ? "발간" : "게시"} {row[dateKey] ?? "-"} · {KIND_LABEL[row.kind ?? ""] ?? row.kind ?? "파일"} · 조회 {row.views_count ?? 0}
                  {row.note ? (
                    <>
                      {" · "}
                      <Highlight text={row.note} term={query} />
                    </>
                  ) : null}
                </p>
              </div>

              <select
                aria-label={`${title} 공개 범위`}
                value={row.visibility}
                disabled={isBusy}
                onChange={(e) => changeVisibility(row, e.target.value as Visibility)}
                className={cn("h-8 rounded-full border px-2.5 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[#2B6CA3]/30", visibilityTone[row.visibility])}
              >
                {VISIBILITIES.map((v) => (
                  <option key={v} value={v}>
                    {VISIBILITY_LABEL[v]}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1">
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900" aria-label={`${title} 열기`} title="새 창으로 열기">
                  <ExternalLink className="h-4 w-4" />
                </a>
                <IconButton label="수정" onClick={() => startEdit(row)} disabled={isBusy}>
                  <Pencil className="h-4 w-4" />
                </IconButton>
                <IconButton label="파일 교체" onClick={() => pickReplacement(row.id)} disabled={isBusy}>
                  <RefreshCw className="h-4 w-4" />
                </IconButton>
                <IconButton label="삭제" onClick={() => remove(row)} disabled={isBusy} danger>
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function IconButton({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md transition disabled:cursor-not-allowed disabled:opacity-40",
        danger ? "text-red-700 hover:bg-red-50" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
      )}
    >
      {children}
    </button>
  );
}

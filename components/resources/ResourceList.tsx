"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./ResourceList.module.css";
import { createClient } from "@supabase/supabase-js";

export type ResourceItem = {
  id: number | string;
  title: string;
  displayname?: string | null;
  kind: string;
  date: string;
  visibility: "public" | "member" | "admin";
  canView: boolean;
  canDownload?: boolean;

  boardSlug: string;
  boardTitle: string;

  originalFilename?: string | null;
};

type ListAuth = {
  isLoggedIn: boolean;
  approved: boolean;
  role: "member" | "admin";
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

function kindLabel(kind: string) {
  switch ((kind || "").toLowerCase()) {
    case "pdf":
      return "PDF";
    case "image":
      return "IMG";
    case "video":
      return "VIDEO";
    case "doc":
      return "DOC";
    case "zip":
      return "ZIP";
    default:
      return "LINK";
  }
}

function displayTitle(it: { displayname?: string | null; title: string }) {
  const dn = (it.displayname || "").trim();
  return dn.length ? dn : it.title;
}

function fileName(it: ResourceItem) {
  return String(it.originalFilename ?? "").trim();
}

export default function ResourceList({
  items: initialItems,
  emptyText = "자료 준비중",
  showCategory,
}: {
  items: ResourceItem[];
  emptyText?: string;
  showCategory?: boolean;
}) {
  const sp = useSearchParams();
  const cat = (sp.get("cat") ?? "").trim();
  const shouldShowCategory = showCategory ?? !cat;

  const [items, setItems] = useState<ResourceItem[]>(initialItems ?? []);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | string | null>(null);

  const [auth, setAuth] = useState<ListAuth>({
    isLoggedIn: false,
    approved: false,
    role: "member",
  });

  const isAdmin = auth.approved && auth.role === "admin";

  const [editing, setEditing] = useState<ResourceItem | null>(null);
  const [editDisplayname, setEditDisplayname] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // replace 기능이면 이것도 “항상” 여기
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replaceBusy, setReplaceBusy] = useState(false);

  async function getToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function refreshList(signal?: AbortSignal) {
    setLoading(true);

    try {
      const token = await getToken();
      const qs = cat ? `?cat=${encodeURIComponent(cat)}` : "";
      const res = await fetch(`/api/resources/list${qs}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
        next: { revalidate: 0 },
        signal,
      });

      const out = await res.json().catch(() => ({}));
      if (!res.ok) return;

      if (out?.auth) setAuth(out.auth as ListAuth);
      if (Array.isArray(out?.items)) setItems(out.items as ResourceItem[]);
    } catch (e: any) {
      // 핵심: abort는 정상 흐름
      if (e?.name === "AbortError") return;
      // 환경에 따라 DOMException code=20으로도 옴
      if (e?.code === 20) return;

      console.error(e);
    } finally {
      // abort된 경우 setState로 또 흔들리는 거 방지
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    setItems(initialItems ?? []);
  }, [initialItems]);

  useEffect(() => {
    const ac = new AbortController();
    refreshList(ac.signal);
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      const ac = new AbortController();
      refreshList(ac.signal);
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasItems = useMemo(() => Array.isArray(items) && items.length > 0, [items]);
  if (loading && !hasItems) return <div className={styles.empty}>불러오는 중…</div>;
  if (!hasItems) return <div className={styles.empty}>{emptyText}</div>;

  function openEdit(it: ResourceItem) {
    if (!isAdmin) return;
    setEditing(it);
    setEditDisplayname((it.displayname ?? "").trim());
  }

  function closeEdit() {
    setEditing(null);
    setEditDisplayname("");
    setEditSaving(false);
  }

  async function saveEdit() {
    if (!editing) return;
    if (!isAdmin) return;

    const dn = editDisplayname.trim();
    const prevDn = (editing.displayname ?? "").trim();
    if (dn === prevDn) {
      closeEdit();
      return;
    }

    try {
      setEditSaving(true);
      setBusyId(editing.id);

      const token = await getToken();
      if (!token) {
        alert("관리자 로그인 필요");
        return;
      }

      const res = await fetch("/api/admin/resources/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          resourceId: Number(editing.id),
          displayname: dn.length ? dn : null,
        }),
      });

      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out?.ok) {
        alert(out?.error || `수정 실패: ${res.status}`);
        return;
      }

      setItems((prev) =>
        prev.map((x) =>
          x.id === editing.id ? { ...x, displayname: dn.length ? dn : null } : x,
        ),
      );

      closeEdit();
    } finally {
      setEditSaving(false);
      setBusyId(null);
    }
  }

  async function openResource(id: number | string, mode: "view" | "download") {
    try {
      setBusyId(id);
      const token = await getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch("/api/resources/url", {
        method: "POST",
        headers,
        body: JSON.stringify({ resourceId: Number(id), mode }),
      });

      const out = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(out?.error || `실패: ${res.status}`);
        return;
      }
      const url = out?.url;
      if (!url) {
        alert("url 발급 실패");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteResource(id: number | string) {
    if (!isAdmin) return;
    if (!confirm("이 자료를 삭제(숨김) 처리할까요?")) return;

    try {
      setBusyId(id);
      const token = await getToken();
      if (!token) {
        alert("관리자 로그인 필요");
        return;
      }

      const res = await fetch("/api/admin/resources/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ resourceId: Number(id) }),
      });

      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out?.ok) {
        alert(out?.error || `삭제 실패: ${res.status}`);
        return;
      }

      setItems((prev) => prev.filter((x) => x.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  const total = items.length;

  function resetReplace() {
    setReplaceFile(null);
    setReplaceBusy(false);
  }

  async function replaceResourceFile() {
    if (!editing) return;
    if (!isAdmin) return;

    if (!replaceFile) {
      alert("교체할 파일을 선택하세요.");
      return;
    }

    if (!confirm("파일을 교체할까요? (기존 파일은 DB에서 연결이 끊기며, 되돌리려면 다시 교체해야 합니다)")) {
      return;
    }

    try {
      setReplaceBusy(true);
      setBusyId(editing.id);

      const token = await getToken();
      if (!token) {
        alert("관리자 로그인 필요");
        return;
      }

      const fd = new FormData();
      fd.append("resourceId", String(editing.id));
      fd.append("file", replaceFile);

      const res = await fetch("/api/admin/resources/replace", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out?.ok) {
        alert(out?.error || `파일 교체 실패: ${res.status}`);
        return;
      }

      const newOriginal = String(out?.resource?.original_filename ?? "");
      setItems((prev) =>
        prev.map((x) => (x.id === editing.id ? { ...x, originalFilename: newOriginal || x.originalFilename } : x)),
      );

      resetReplace();
      alert("파일이 교체되었습니다.");
    } finally {
      setReplaceBusy(false);
      setBusyId(null);
    }
  }

  return (
    <div className={styles.boardWrap}>
      <div className={styles.boardTableWrap}>
        <table className={styles.boardTable}>
          <thead>
            <tr>
              <th className={styles.colNo}>번호</th>
              <th className={styles.colTitle}>제목</th>
              <th className={styles.colDate}>등록일</th>
              <th className={styles.colDl}>관리</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const no = total - idx;
              const disabled = busyId === it.id || editSaving;

              return (
                <tr key={it.id} className={styles.boardRow}>
                  <td className={styles.noCell}>{no}</td>

                  <td className={styles.titleCell}>
                    <div className={styles.titleLine}>
                      {shouldShowCategory && it.boardTitle ? (
                        <span className={styles.catBadge}>{it.boardTitle}</span>
                      ) : null}

                      <button
                        type="button"
                        className={styles.titleBtn}
                        onClick={() => openResource(it.id, "view")}
                        disabled={disabled}
                        title="열기"
                      >
                        {displayTitle(it)}
                      </button>
                    </div>

                    <div className={styles.fileMeta}>
                      <span className={styles.fileName}>{fileName(it)}</span>
                    </div>
                  </td>

                  <td className={styles.dateCell}>{it.date}</td>

                  <td className={styles.dlCell}>
                    <div className={styles.rowActions}>
                      {it.canDownload ? (
                        <button
                          type="button"
                          className={styles.dlBtn}
                          onClick={() => openResource(it.id, "download")}
                          disabled={disabled}
                        >
                          다운로드
                        </button>
                      ) : (
                        <span className={styles.noDl}>-</span>
                      )}

                      {isAdmin ? (
                        <button
                          type="button"
                          className={styles.editBtn}
                          onClick={() => openEdit(it)}
                          disabled={disabled}
                        >
                          수정
                        </button>
                      ) : null}

                      {isAdmin ? (
                        <button
                          type="button"
                          className={styles.delBtn}
                          onClick={() => deleteResource(it.id)}
                          disabled={disabled}
                        >
                          삭제
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className={styles.mobileList}>
        {items.map((it) => {
          const disabled = busyId === it.id || editSaving;

          return (
            <li key={it.id} className={styles.mobileItem}>
              <div className={styles.mobileTop}>
                <div className={styles.mobileBadges}>
                  <span className={styles.kindBadge}>{kindLabel(it.kind)}</span>
                  {shouldShowCategory && it.boardTitle ? (
                    <span className={styles.catBadge}>{it.boardTitle}</span>
                  ) : null}
                </div>
                <span className={styles.mobileDate}>{it.date}</span>
              </div>

              <button
                type="button"
                className={styles.mobileTitle}
                onClick={() => openResource(it.id, "view")}
                disabled={disabled}
              >
                {displayTitle(it)}
              </button>

              <div className={styles.mobileFileMeta}>
                <span className={styles.fileName}>{fileName(it)}</span>
              </div>

              <div className={styles.mobileActions}>
                {it.canDownload ? (
                  <button
                    type="button"
                    className={styles.dlBtn}
                    onClick={() => openResource(it.id, "download")}
                    disabled={disabled}
                  >
                    다운로드
                  </button>
                ) : (
                  <span className={styles.noDl}>다운로드 불가</span>
                )}

                {isAdmin ? (
                  <button
                    type="button"
                    className={styles.editBtn}
                    onClick={() => openEdit(it)}
                    disabled={disabled}
                  >
                    수정
                  </button>
                ) : null}

                {isAdmin ? (
                  <button
                    type="button"
                    className={styles.delBtn}
                    onClick={() => deleteResource(it.id)}
                    disabled={disabled}
                  >
                    삭제
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {editing ? (
        <div className={styles.modalOverlay} onClick={closeEdit}>
          <div className={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>자료 수정</div>
              <button className={styles.modalClose} onClick={closeEdit} type="button">
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalHint}>표시 제목만 수정됩니다.</div>

              <label className={styles.field}>
                <div className={styles.fieldLabel}>표시 제목</div>
                <input
                  value={editDisplayname}
                  onChange={(e) => setEditDisplayname(e.target.value)}
                  className={styles.fieldInput}
                  placeholder="예) 2025년 9월 발간물"
                  disabled={editSaving}
                />
                <div className={styles.fieldHelp}>
                  비워두면 표시 제목은 내부 title로 대체됩니다.
                </div>
              </label>
              <div className={styles.field}>
                <div className={styles.fieldLabel}>파일</div>
                <div className={styles.fileRow}>
                  <div className={styles.fileNameText}>
                    {fileName(editing)}
                  </div>
                </div>

                <div className={styles.replaceRow}>
                  <input
                    type="file"
                    className={styles.fileInput}
                    onChange={(e) => setReplaceFile(e.target.files?.[0] ?? null)}
                    disabled={replaceBusy || editSaving}
                  />

                  <button
                    type="button"
                    className={styles.replaceBtn}
                    onClick={replaceResourceFile}
                    disabled={!replaceFile || replaceBusy || editSaving}
                  >
                    {replaceBusy ? "교체 중…" : "파일 교체"}
                  </button>
                </div>

                {replaceFile ? (
                  <div className={styles.fieldHelp}>
                    선택됨: {replaceFile.name} ({Math.round(replaceFile.size / 1024)} KB)
                  </div>
                ) : (
                  <div className={styles.fieldHelp}>
                    같은 종류(kind)의 파일만 교체할 수 있습니다. (예: pdf는 pdf로만)
                  </div>
                )}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.modalCancel}
                onClick={closeEdit}
                disabled={editSaving}
              >
                취소
              </button>
              <button
                type="button"
                className={styles.modalSave}
                onClick={saveEdit}
                disabled={editSaving}
              >
                {editSaving ? "저장 중…" : "저장"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
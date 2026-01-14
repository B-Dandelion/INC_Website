"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./ResourceList.module.css";
import { createClient } from "@supabase/supabase-js";

export type ResourceItem = {
  id: number | string;
  title: string;         // 기존: 파일명/내부 title
  kind: string;
  note?: string;
  date: string;          // YYYY-MM-DD
  visibility: "public" | "member" | "admin";
  canView: boolean;
  canDownload?: boolean;

  boardSlug: string;
  boardTitle: string;

  // ✅ 가능하면 API에서 내려줘서 이걸로 표시(확장자 추정 필요 없음)
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
    case "pdf": return "PDF";
    case "image": return "IMG";
    case "video": return "VIDEO";
    case "doc": return "DOC";
    case "zip": return "ZIP";
    default: return "LINK";
  }
}

function displayTitle(it: { note?: string; title: string }) {
  const t = (it.note || "").trim();
  return t.length ? t : it.title;
}

function fileNameWithExt(it: ResourceItem) {
  // ✅ 1순위: DB에 저장된 원본 파일명(확장자 포함)
  const original = (it.originalFilename ?? "").trim();
  if (original) return original;

  // ✅ 2순위: title에 이미 확장자가 있으면 그대로
  const base = (it.title || "").trim();
  if (!base) return "";
  if (base.includes(".")) return base;

  // ✅ 3순위: kind로 최소한의 fallback (정확도 떨어짐)
  const k = (it.kind || "").toLowerCase();
  const ext =
    k === "pdf" ? "pdf" :
    k === "image" ? "img" :
    k === "video" ? "mp4" :
    k === "doc" ? "doc" :
    k === "zip" ? "zip" : "";
  return ext ? `${base}.${ext}` : base;
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

  const canDelete = auth.approved && auth.role === "admin";

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
    } finally {
      setLoading(false);
    }
  }

  // ✅ initialItems 동기화 (페이지가 서버에서 내려주는 값이 바뀌면 반영)
  useEffect(() => {
    setItems(initialItems ?? []);
  }, [initialItems]);

  // ✅ cat 변경 시 목록 재조회
  useEffect(() => {
    const ac = new AbortController();
    refreshList(ac.signal);
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat]);

  // ✅ 로그인/로그아웃 등 auth 상태 변화 시 재조회
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      // cat은 유지, 목록만 갱신
      const ac = new AbortController();
      refreshList(ac.signal);
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (!canDelete) return;
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
      if (!res.ok) {
        alert(out?.error || `삭제 실패: ${res.status}`);
        return;
      }

      // 소프트 삭제: UI에서 즉시 제거
      setItems((prev) => prev.filter((x) => x.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  const hasItems = useMemo(() => Array.isArray(items) && items.length > 0, [items]);

  if (loading && !hasItems) return <div className={styles.empty}>불러오는 중…</div>;
  if (!hasItems) return <div className={styles.empty}>{emptyText}</div>;

  const total = items.length;

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
              const disabled = busyId === it.id;

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
                      <span className={styles.fileName}>{fileNameWithExt(it)}</span>
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

                      {canDelete ? (
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

      {/* 모바일 */}
      <ul className={styles.mobileList}>
        {items.map((it) => {
          const disabled = busyId === it.id;
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
                <span className={styles.fileName}>{fileNameWithExt(it)}</span>
              </div>

              {it.note ? <div className={styles.mobileNote}>{it.note}</div> : null}

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

                {canDelete ? (
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
    </div>
  );
}
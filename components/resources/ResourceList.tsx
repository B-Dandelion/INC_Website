"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./ResourceList.module.css";
import { createClient } from "@supabase/supabase-js";

export type ResourceItem = {
  id: number | string;
  title: string;
  kind: string;
  note?: string;
  date: string;
  visibility: "public" | "member" | "admin";
  canView: boolean;
  canDownload?: boolean;

  boardSlug: string;
  boardTitle: string;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

function kindLabel(kind: string) {
  switch (kind) {
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

function kindToExt(kind: string) {
  switch ((kind || "").toLowerCase()) {
    case "pdf": return "pdf";
    case "image": return "img";
    case "video": return "mp4";
    case "doc": return "doc";
    case "zip": return "zip";
    default: return "";
  }
}

function fileNameWithExt(fileName: string, kind: string) {
  const base = (fileName || "").trim();
  if (!base) return "";
  if (base.includes(".")) return base; // 이미 확장자 있으면 그대로
  const ext = kindToExt(kind);
  return ext ? `${base}.${ext}` : base;
}

function fileExt(fileName: string) {
  const base = (fileName || "").trim();
  const idx = base.lastIndexOf(".");
  if (idx <= 0 || idx === base.length - 1) return "";
  return base.slice(idx + 1).toUpperCase();
}

function displayTitle(it: { note?: string; title: string }) {
  const t = (it.note || "").trim();
  return t.length ? t : it.title; // note 없으면 파일명으로 대체
}

export default function ResourceList({
  items: initialItems,
  emptyText = "자료 준비중",
  showCategory,
}: {
  items: ResourceItem[];
  emptyText?: string;
  // 넘기면 그 값을 사용, 안 넘기면 "전체(cat 없음)"일 때만 자동 표시
  showCategory?: boolean;
}) {
  const sp = useSearchParams();
  const cat = (sp.get("cat") ?? "").trim();
  const shouldShowCategory = showCategory ?? !cat;

  const [items, setItems] = useState<ResourceItem[]>(initialItems ?? []);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | string | null>(null);
  const [authTick, setAuthTick] = useState(0);

  async function getToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      setAuthTick((v) => v + 1);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // cat 변경(또는 로그인 상태에 따른 토큰) 기준으로 목록 재조회
  useEffect(() => {
    setItems(initialItems ?? []);

    let alive = true;

    (async () => {
      setLoading(true);
      try {
        const token = await getToken();
        const qs = cat ? `?cat=${encodeURIComponent(cat)}` : "";
        const res = await fetch(`/api/resources/list${qs}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
        });
        const out = await res.json().catch(() => ({}));
        if (!alive) return;

        if (res.ok && Array.isArray(out?.items)) setItems(out.items);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [cat, authTick]);

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
              <th className={styles.colDl}>다운로드</th>
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
                      >
                        {displayTitle(it)}
                      </button>
                    </div>

                    <div className={styles.fileMeta}>
                      <span className={styles.fileName}>
                        {fileNameWithExt(it.title, it.kind)}
                      </span>
                    </div>
                  </td>

                  <td className={styles.dateCell}>{it.date}</td>

                  <td className={styles.dlCell}>
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
                {it.title}
              </button>

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
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
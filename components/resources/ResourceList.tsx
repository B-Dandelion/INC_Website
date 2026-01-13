"use client";

import { useMemo, useState } from "react";
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

  // (선택) 다운로드/표시 확장 대비해서 넣어두면 나중에 덜 깨짐
  r2_key?: string | null;
  boards?: { slug: string }[] | null;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

function kindLabel(kind: string) {
  switch (kind) {
    case "pdf": return "PDF";
    case "image": return "IMG";
    case "video": return "VIDEO";
    case "doc": return "DOC";
    case "zip": return "ZIP";
    default: return "LINK";
  }
}

export default function ResourceList({
  items,
  emptyText = "자료 준비중",
}: {
  items: ResourceItem[];
  emptyText?: string;
}) {
  // 표시 전용: props items만 사용
  const hasItems = useMemo(() => Array.isArray(items) && items.length > 0, [items]);
  const [busyId, setBusyId] = useState<number | string | null>(null);

  async function getToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
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

  if (!hasItems) {
    return <div className={styles.empty}>{emptyText}</div>;
  }

  return (
    <div className={styles.wrap}>
      {/* 데스크톱: 게시판(테이블) */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.colKind}>종류</th>
              <th className={styles.colTitle}>제목</th>
              <th className={styles.colDate}>게시일</th>
              <th className={styles.colNote}>비고</th>
              <th className={styles.colActions}>다운로드</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className={styles.row}>
                <td className={styles.kindCell}>{kindLabel(it.kind)}</td>

                <td className={styles.titleCell}>
                  <button
                    type="button"
                    className={styles.titleBtn}
                    onClick={() => openResource(it.id, "view")}
                    disabled={busyId === it.id}
                    title="열기"
                  >
                    {it.title}
                  </button>
                </td>

                <td className={styles.dateCell}>{it.date}</td>
                <td className={styles.noteCell}>{it.note ?? "-"}</td>

                <td className={styles.actionsCell}>
                  {it.canDownload ? (
                    <button
                      type="button"
                      className={styles.downloadBtn}
                      onClick={() => openResource(it.id, "download")}
                      disabled={busyId === it.id}
                    >
                      다운로드
                    </button>
                  ) : (
                    <span className={styles.noDownload}>-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 모바일: 카드 리스트 */}
      <ul className={styles.mobileList}>
        {items.map((it) => (
          <li key={it.id} className={styles.mobileItem}>
            <div className={styles.mobileTop}>
              <span className={styles.mobileKind}>{kindLabel(it.kind)}</span>
              <span className={styles.mobileDate}>{it.date}</span>
            </div>

            <button
              type="button"
              className={styles.mobileTitle}
              onClick={() => openResource(it.id, "view")}
              disabled={busyId === it.id}
            >
              {it.title}
            </button>

            {it.note ? <div className={styles.mobileNote}>{it.note}</div> : null}

            <div className={styles.mobileActions}>
              {it.canDownload ? (
                <button
                  type="button"
                  className={styles.mobileDownload}
                  onClick={() => openResource(it.id, "download")}
                  disabled={busyId === it.id}
                >
                  다운로드
                </button>
              ) : (
                <span className={styles.noDownload}>다운로드 불가</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
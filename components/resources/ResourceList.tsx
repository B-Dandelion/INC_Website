"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./ResourceList.module.css";
import { createClient } from "@supabase/supabase-js";

type ResourceItem = {
  id: number | string;
  title: string;
  kind: string;
  note?: string;
  date?: string;
  visibility?: "public" | "member" | "admin";
  canView?: boolean;
  canDownload?: boolean;
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
  items: initialItems,
  emptyText = "자료 준비중",
}: {
  items: ResourceItem[];
  emptyText?: string;
}) {
  const [items, setItems] = useState<ResourceItem[]>(initialItems ?? []);
  const [loading, setLoading] = useState(false);

  async function getToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  // 로그인 상태에 따라 "보일 수 있는 목록"을 API에서 다시 받아옴
  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      try {
        const token = await getToken();
        const res = await fetch("/api/resources/list", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const out = await res.json().catch(() => ({}));
        if (!alive) return;

        if (res.ok && out?.items) setItems(out.items);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, []);

  async function openResource(id: number | string, mode: "view" | "download") {
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
  }

  const hasItems = useMemo(() => items && items.length > 0, [items]);

  if (loading && !hasItems) {
    return <div className={styles.empty}>불러오는 중…</div>;
  }

  if (!hasItems) {
    return <div className={styles.empty}>{emptyText}</div>;
  }

  return (
    <ul className={styles.list}>
      {items.map((it) => (
        <li key={it.id} className={styles.item}>
          <span className={styles.kind}>{kindLabel(it.kind)}</span>

          <button
            type="button"
            className={styles.title}
            onClick={() => openResource(it.id, "view")}
            title="열기"
          >
            {it.title}
          </button>

          {it.canDownload ? (
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.download}
                onClick={() => openResource(it.id, "download")}
              >
                다운로드
              </button>
            </div>
          ) : null}

          {(it.date || it.note) && (
            <div className={styles.meta}>
              {it.date && <span className={styles.date}>{it.date}</span>}
              {it.note && <span className={styles.note}>{it.note}</span>}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
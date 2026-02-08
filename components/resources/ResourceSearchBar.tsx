// components/resources/ResourceSearchBar.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./resources.module.css";

function pick(params: URLSearchParams, keys: string[]) {
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = params.get(k);
    if (v) out[k] = v;
  }
  return out;
}

export default function ResourceSearchBar({
  basePath,
}: {
  basePath: string; // "/resources" or `/resources/${boardSlug}`
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const currentQ = sp.get("q") ?? "";
  const [q, setQ] = useState(currentQ);

  const preserved = useMemo(() => {
    // 검색 바꾸면 page는 1로 리셋, path/pageSize는 유지
    const keep = pick(sp, ["path", "pageSize"]);
    return keep;
  }, [sp]);

  function submit() {
    const usp = new URLSearchParams(preserved);
    if (q.trim()) usp.set("q", q.trim());
    usp.set("page", "1");
    const qs = usp.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  return (
    <div className={styles.searchBar}>
      <input
        className={styles.searchInput}
        value={q}
        placeholder="제목으로 검색"
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
      />
      <button className={styles.searchBtn} onClick={submit}>
        검색
      </button>
      {currentQ ? (
        <button
          className={styles.searchClear}
          onClick={() => {
            setQ("");
            const usp = new URLSearchParams(preserved);
            usp.set("page", "1");
            const qs = usp.toString();
            router.push(qs ? `${basePath}?${qs}` : basePath);
          }}
        >
          초기화
        </button>
      ) : null}
    </div>
  );
}

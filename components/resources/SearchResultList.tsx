// Legacy compatibility component.
// The public search UI now lives in app/search/page.tsx and groups results by
// resources, notices, and events. Keep this file only for any older imports.

"use client";

import styles from "@/components/resources/ResourceBoard.module.css";

type Row = {
  id: number;
  title: string;
  subtitle?: string;
  kind?: string | null;
};

export default function SearchResultList({ rows }: { rows: Row[] }) {
  return (
    <div className={styles.board}>
      {rows.map((r) => (
        <a key={r.id} className={styles.row} href={`/api/resources/go?id=${r.id}`} target="_blank" rel="noreferrer">
          <div className={styles.left}>
            <div className={styles.title}>{r.title}</div>
            {r.subtitle ? <div className={styles.sub}>{r.subtitle}</div> : null}
          </div>
          <div className={styles.right}><span className={styles.open}>↗</span></div>
        </a>
      ))}
    </div>
  );
}

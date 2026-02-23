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
      {rows.map((r) => {
        const thumbUrl = `/api/resources/go?id=${r.id}`;
        const kind = r.kind ?? "";

        return (
          <a
            key={r.id}
            className={styles.row}
            href={thumbUrl}
            target="_blank"
            rel="noreferrer"
          >
            <div className={styles.left} style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {/* thumbnail */}
              {kind === "image" ? (
                <img
                  src={thumbUrl}
                  alt=""
                  style={{
                    width: 56,
                    height: 56,
                    objectFit: "cover",
                    borderRadius: 10,
                    border: "1px solid #eee",
                    flex: "0 0 auto",
                  }}
                />
              ) : kind === "video" ? (
                <video
                  src={thumbUrl}
                  muted
                  playsInline
                  preload="metadata"
                  style={{
                    width: 56,
                    height: 56,
                    objectFit: "cover",
                    borderRadius: 10,
                    border: "1px solid #eee",
                    flex: "0 0 auto",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 10,
                    border: "1px solid #eee",
                    display: "grid",
                    placeItems: "center",
                    opacity: 0.6,
                    fontSize: 12,
                    flex: "0 0 auto",
                  }}
                  title={kind || "file"}
                >
                  {kind || "file"}
                </div>
              )}

              {/* text */}
              <div style={{ minWidth: 0 }}>
                <div className={styles.title}>{r.title}</div>
                {r.subtitle ? <div className={styles.sub}>{r.subtitle}</div> : null}
              </div>
            </div>

            <div className={styles.right}>
              <span className={styles.open}>열기</span>
            </div>
          </a>
        );
      })}
    </div>
  );
}
// components/resources/ResourceList.tsx
import styles from "./resources.module.css";
import type { ResourceRow } from "@/lib/resourcesDb";

function fmtDate(d?: string) {
  if (!d) return "-";
  return d;
}

export default function ResourceList({
  rows,
  showBoardBadge,
}: {
  rows: ResourceRow[];
  showBoardBadge?: boolean;
}) {
  if (!rows.length) {
    return <div className={styles.empty}>표시할 자료가 없습니다.</div>;
  }

  return (
    <div className={styles.list}>
      {rows.map((r) => {
        const boardTitle = r.boards?.title ?? "";
        const goHref = `/api/resources/go?id=${r.id}`;

        return (
          <div className={styles.row} key={r.id}>
            <div className={styles.left}>
              {showBoardBadge ? (
                <span className={styles.badge}>{boardTitle}</span>
              ) : null}

              <a className={styles.title} href={goHref}>
                {r.title}
              </a>

              <div className={styles.meta}>
                <span className={styles.kind}>{r.kind}</span>
                {typeof r.view_count === "number" ? (
                  <span className={styles.views}>조회 {r.view_count}</span>
                ) : null}
              </div>
            </div>

            <div className={styles.right}>
              <div className={styles.date}>{fmtDate(r.published_at)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
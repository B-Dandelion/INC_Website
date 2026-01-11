import Link from "next/link";
import styles from "./ResourceList.module.css";

export type ResourceListItem = {
  id: number | string;
  title: string;
  kind: string;
  href?: string;          // optional
  downloadHref?: string;  // optional
  date?: string;
  note?: string;
  locked?: boolean;
};

function kindLabel(kind: string) {
  switch (kind) {
    case "pdf": return "PDF";
    case "image": return "IMG";
    case "video": return "VIDEO";
    case "post": return "POST";
    case "slide": return "SLIDE";
    case "doc": return "DOC";
    case "zip": return "ZIP";
    default: return "LINK";
  }
}

export default function ResourceList({
  items,
  emptyText = "자료 준비중",
}: {
  items: ResourceListItem[];
  emptyText?: string;
}) {
  if (!items || items.length === 0) {
    return <div className={styles.empty}>{emptyText}</div>;
  }

  return (
    <ul className={styles.list}>
      {items.map((it) => (
        <li key={it.id} className={styles.item}>
          <span className={styles.kind}>{kindLabel(it.kind)}</span>

          {it.href ? (
            it.href.startsWith("http") ? (
              <a className={styles.title} href={it.href} target="_blank" rel="noreferrer">
                {it.title}
              </a>
            ) : (
              <Link className={styles.title} href={it.href}>
                {it.title}
              </Link>
            )
          ) : (
            <span className={styles.title}>{it.title}</span>
          )}

          {it.downloadHref ? (
            <div className={styles.actions}>
              <a className={styles.download} href={it.downloadHref} target="_blank" rel="noreferrer">
                다운로드
              </a>
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
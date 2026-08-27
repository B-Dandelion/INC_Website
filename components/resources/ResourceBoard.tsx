// components/resources/ResourceBoard.tsx
import styles from "./ResourceBoard.module.css";
import { getLocale } from "@/lib/i18n";

export type BoardItem = {
  id: number;
  title: string;
  subtitle?: string;
  rightMeta?: string;
};

export default async function ResourceBoard({ items }: { items: BoardItem[] }) {
  const locale = await getLocale();
  const en = locale === "en";

  if (!items.length) {
    return <div className={styles.empty}>{en ? "No resources to display." : "등록된 자료가 없습니다."}</div>;
  }

  return (
    <div className={styles.board}>
      {items.map((it) => (
        <a key={it.id} className={styles.row} href={`/api/resources/go?id=${it.id}`} target="_blank" rel="noreferrer">
          <div className={styles.left}>
            <div className={styles.title}>{it.title}</div>
            {it.subtitle ? <div className={styles.sub}>{it.subtitle}</div> : null}
          </div>
          <div className={styles.right}>
            {it.rightMeta ? <span className={styles.meta}>{it.rightMeta}</span> : null}
            <span className={styles.open}>{en ? "Open" : "열기"}</span>
          </div>
        </a>
      ))}
    </div>
  );
}

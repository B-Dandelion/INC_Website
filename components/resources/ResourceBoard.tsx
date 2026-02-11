// components/resources/ResourceBoard.tsx
import styles from "./ResourceBoard.module.css";

export type BoardItem = {
  id: number;
  title: string;
  subtitle?: string;   // 세부 내용(없으면 생략)
  rightMeta?: string;  // 예: "No. 12" / "2025-01-01" 등
};

export default function ResourceBoard({ items }: { items: BoardItem[] }) {
  if (!items.length) {
    return (
      <div className={styles.empty}>
        등록된 자료가 없습니다.
      </div>
    );
  }

  return (
    <div className={styles.board}>
      {items.map((it) => (
        <a
          key={it.id}
          className={styles.row}
          href={`/api/resources/go?id=${it.id}`}
          target="_blank"
          rel="noreferrer"
        >
          <div className={styles.left}>
            <div className={styles.title}>{it.title}</div>
            {it.subtitle ? <div className={styles.sub}>{it.subtitle}</div> : null}
          </div>

          <div className={styles.right}>
            {it.rightMeta ? <span className={styles.meta}>{it.rightMeta}</span> : null}
            <span className={styles.open}>열기</span>
          </div>
        </a>
      ))}
    </div>
  );
}

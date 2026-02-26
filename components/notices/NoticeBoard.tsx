// components/notices/NoticeBoard.tsx
import Link from "next/link";
import styles from "@/components/resources/ResourceBoard.module.css";

export type NoticeBoardItem = {
  id: number;
  title: string;
  subtitle?: string;
  rightMeta?: string;
  href: string;
};

export default function NoticeBoard({ items }: { items: NoticeBoardItem[] }) {
  if (!items.length) {
    return <div className={styles.empty}>등록된 공지사항이 없습니다.</div>;
  }

  return (
    <div className={styles.board}>
      {items.map((it) => (
        <Link key={it.id} className={styles.row} href={it.href}>
          <div className={styles.left}>
            <div className={styles.title}>{it.title}</div>
            {it.subtitle ? <div className={styles.sub}>{it.subtitle}</div> : null}
          </div>

          <div className={styles.right}>
            {it.rightMeta ? <span className={styles.meta}>{it.rightMeta}</span> : null}
            <span className={styles.open}>보기</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
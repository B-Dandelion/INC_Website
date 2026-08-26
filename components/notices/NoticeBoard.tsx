// components/notices/NoticeBoard.tsx
import Link from "next/link";
import styles from "@/components/resources/ResourceBoard.module.css";
import { getLocale } from "@/lib/i18n";

export type NoticeBoardItem = {
  id: number;
  title: string;
  subtitle?: string;
  rightMeta?: string;
  href: string;
};

export default async function NoticeBoard({ items }: { items: NoticeBoardItem[] }) {
  const locale = await getLocale();
  const en = locale === "en";

  if (!items.length) {
    return <div className={styles.empty}>{en ? "No notices to display." : "등록된 공지사항이 없습니다."}</div>;
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
            <span className={styles.open}>{en ? "View" : "보기"}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

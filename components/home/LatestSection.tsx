import Link from "next/link";
import styles from "./LatestSection.module.css";
import type { LatestItem } from "@/lib/homeData";

type Props = {
  notices: LatestItem[];
  resources: LatestItem[];
  event?: LatestItem | null;
};

function ListBlock({
  title,
  href,
  items,
}: {
  title: string;
  href: string;
  items: LatestItem[];
}) {
  return (
    <div className={styles.block}>
      <div className={styles.blockHeader}>
        <h3 className={styles.blockTitle}>{title}</h3>
        <Link className={styles.more} href={href}>
          더보기
        </Link>
      </div>

      <ul className={styles.list}>
        {items.map((it) => (
          <li key={it.href} className={styles.listItem}>
            <Link className={styles.itemLink} href={it.href}>
              <span className={styles.itemTitle}>{it.title}</span>
              <span className={styles.itemDate}>{it.date}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function LatestSection({ notices, resources, event }: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <h2 className={styles.heading}>Latest</h2>
          <p className={styles.subheading}>최근 업데이트된 공지와 자료를 확인하세요.</p>
        </div>

        <div className={styles.grid}>
          <ListBlock title="공지사항" href="/news" items={notices} />
          <ListBlock title="자료실" href="/resources" items={resources} />

          {event ? (
            <div className={styles.event}>
              <div className={styles.eventLabel}>행사</div>
              <Link className={styles.eventTitle} href={event.href}>
                {event.title}
              </Link>
              <div className={styles.eventMeta}>{event.date}</div>
              <div className={styles.eventHint}>
                일정과 신청 안내는 상세 페이지에서 확인할 수 있습니다.
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

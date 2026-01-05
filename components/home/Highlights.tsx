import Link from "next/link";
import styles from "./Highlights.module.css";
import type { HighlightItem } from "@/lib/homeData";

type Props = {
  items: HighlightItem[];
};

export default function Highlights({ items }: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <h2 className={styles.heading}>Highlights</h2>
          <p className={styles.subheading}>주요 연구·프로젝트를 요약해 보여줍니다.</p>
        </div>

        <div className={styles.grid}>
          {items.map((it) => (
            <Link key={it.href} href={it.href} className={styles.card}>
              <div className={styles.cardTitle}>{it.title}</div>
              <div className={styles.cardSummary}>{it.summary}</div>

              <div className={styles.tags}>
                {it.tags.map((t) => (
                  <span key={t} className={styles.tag}>
                    {t}
                  </span>
                ))}
              </div>

              <div className={styles.more}>자세히 보기</div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

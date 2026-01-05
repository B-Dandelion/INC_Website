import Link from "next/link";
import styles from "./QuickLinks.module.css";
import type { LinkCard } from "@/lib/homeData";

type Props = {
  items: LinkCard[];
};

export default function QuickLinks({ items }: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <h2 className={styles.heading}>Quick Links</h2>
        <div className={styles.grid}>
          {items.map((item) => (
            <Link key={item.href} href={item.href} className={styles.card}>
              <div className={styles.cardTitle}>{item.title}</div>
              <div className={styles.cardDesc}>{item.description}</div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

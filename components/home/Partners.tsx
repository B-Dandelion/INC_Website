import Image from "next/image";
import Link from "next/link";
import styles from "./Partners.module.css";
import type { PartnerItem } from "@/lib/homeData";

type Props = {
  items: PartnerItem[];
};

function PartnerLogo({ p }: { p: PartnerItem }) {
  if (p.logoSrc) {
    return (
      <Image
        src={p.logoSrc}
        alt={p.name}
        width={140}
        height={56}
        className={styles.logoImg}
      />
    );
  }

  return <div className={styles.logoFallback}>{p.name}</div>;
}

export default function Partners({ items }: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <h2 className={styles.heading}>Global / Partners</h2>
          <p className={styles.subheading}>협력기관 및 국제 파트너 네트워크</p>
        </div>

        <div className={styles.grid}>
          {items.map((p) => (
            <Link key={p.name} href={p.href} className={styles.logoCard}>
              <PartnerLogo p={p} />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

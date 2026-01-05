import Link from "next/link";
import styles from "./Footer.module.css";
import type { PolicyLink } from "@/lib/homeData";

type Props = {
  policyLinks: PolicyLink[];
  orgName?: string;
};

export default function Footer({ policyLinks, orgName = "INC" }: Props) {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <div className={styles.brand}>{orgName}</div>
          <div className={styles.copy}>All rights reserved.</div>
        </div>

        <nav className={styles.nav}>
          {policyLinks.map((p) => (
            <Link key={p.href} href={p.href} className={styles.link}>
              {p.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

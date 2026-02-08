// components/resources/BoardNav.tsx
import Link from "next/link";
import type { BoardRow } from "@/lib/resourcesDb";
import styles from "./BoardNav.module.css";

export default function BoardNav({
  boards,
  activeSlug,
}: {
  boards: BoardRow[];
  activeSlug?: string | null;
}) {
  return (
    <nav className={styles.nav}>
      <Link className={`${styles.item} ${!activeSlug ? styles.active : ""}`} href="/resources">
        전체 게시물
      </Link>

      <div className={styles.divider} />

      {boards.map((b) => (
        <Link
          key={b.id}
          className={`${styles.item} ${activeSlug === b.slug ? styles.active : ""}`}
          href={`/resources/${encodeURIComponent(b.slug)}`}
        >
          {b.title}
        </Link>
      ))}
    </nav>
  );
}

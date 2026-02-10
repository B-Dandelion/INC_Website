"use client";

import { useEffect, useState } from "react";
import styles from "./sectionTabs.module.css";

export type SectionTabItem = { id: string; label: string };

export default function SectionTabs({
  items,
  defaultId,
}: {
  items: SectionTabItem[];
  defaultId?: string;
}) {
  const first = defaultId ?? items[0]?.id ?? "";
  const [active, setActive] = useState(first);

  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash?.replace("#", "");
      if (hash && items.some((it) => it.id === hash)) setActive(hash);
      else setActive(first);
    };

    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [items, first]);

  return (
    <nav className={styles.tabs} aria-label="섹션 탭">
      {items.map((it) => {
        const isActive = it.id === active;
        return (
          <a
            key={it.id}
            href={`#${it.id}`}
            className={`${styles.tab} ${isActive ? styles.active : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            {it.label}
          </a>
        );
      })}
    </nav>
  );
}

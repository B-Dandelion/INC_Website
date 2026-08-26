// components/notices/NoticeFrame.tsx
import Link from "next/link";
import styles from "@/components/resources/resourcesFrame.module.css";
import { getLocale } from "@/lib/i18n";

type SideItem = { id: number; title: string; posted_at: string };

export default async function NoticeFrame({
  sideItems,
  activeId,
  children,
}: {
  sideItems: SideItem[];
  activeId?: number | null;
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const en = locale === "en";

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>{en ? "Notices" : "공지사항"}</div>

        <nav className={styles.nav}>
          {sideItems.map((n) => {
            const active = activeId === n.id;
            return (
              <div key={n.id} className={styles.navGroup}>
                <Link
                  href={`/notice/${n.id}`}
                  className={`${styles.navItem} ${active ? styles.navActive : ""}`}
                  title={n.title}
                >
                  <div style={{ fontWeight: 800, lineHeight: 1.2 }}>{n.title}</div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{n.posted_at}</div>
                </Link>
              </div>
            );
          })}
        </nav>
      </aside>

      <main className={styles.main}>{children}</main>
    </div>
  );
}

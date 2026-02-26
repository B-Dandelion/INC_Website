// components/notices/NoticeFrame.tsx
import Link from "next/link";
import styles from "@/components/resources/resourcesFrame.module.css";

type SideItem = { id: number; title: string; posted_at: string };

export default function NoticeFrame({
  sideItems,
  activeId,
  children,
}: {
  sideItems: SideItem[];
  activeId?: number | null;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>공지사항</div>

        <nav className={styles.nav}>

          {/* 최신 공지 10개 */}
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
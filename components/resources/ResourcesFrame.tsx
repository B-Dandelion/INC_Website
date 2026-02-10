// components/resources/ResourcesFrame.tsx
import Link from "next/link";
import styles from "./resourcesFrame.module.css";

export type ResourceNavKey =
  | "atm"
  | "heartbeat"
  | "lectures"
  | "columns"
  | "seminars"
  | "essay"
  | "shortform"
  | "reports"
  | "others"
  | "workshop"
  | "expert";

const NAV: Array<{ key: ResourceNavKey; label: string; href: string }> = [
  { key: "atm", label: "ATM", href: "/resources/atm" },
  { key: "heartbeat", label: "Heartbeat of Atoms", href: "/resources/heartbeat" },
  { key: "lectures", label: "강연자료", href: "/resources/lectures" },
  { key: "columns", label: "기고문", href: "/resources/columns" },
  { key: "seminars", label: "세미나", href: "/resources/seminars" },
  { key: "expert", label: "전문가기획보고서", href: "/resources/expert" },
  { key: "essay", label: "에세이 경진대회", href: "/resources/essay-contest" },
  { key: "shortform", label: "숏폼영상공모전", href: "/resources/shortform" },
  { key: "reports", label: "과제 보고회", href: "/resources/reports" },
  { key: "others", label: "기타 보고서", href: "/resources/others" },
  { key: "workshop", label: "워크샵", href: "/resources/workshop" },
];

export default function ResourcesFrame({
  activeKey,
  sidebarSubmenu,
  children,
}: {
  activeKey: ResourceNavKey;
  sidebarSubmenu?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>카테고리</div>

        <nav className={styles.nav}>
          {NAV.map((item) => {
            const active = item.key === activeKey;

            return (
              <div key={item.key} className={styles.navGroup}>
                <Link
                  href={item.href}
                  className={`${styles.navItem} ${active ? styles.navActive : ""}`}
                >
                  {item.label}
                </Link>

                {/* 선택된 카테고리 바로 아래에 서브메뉴 펼침 */}
                {active && sidebarSubmenu ? (
                  <div className={styles.submenuWrap}>{sidebarSubmenu}</div>
                ) : null}
              </div>
            );
          })}
        </nav>
      </aside>

      <main className={styles.main}>{children}</main>
    </div>
  );
}

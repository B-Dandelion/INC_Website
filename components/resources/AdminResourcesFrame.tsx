// components/resources/AdminResourcesFrame.tsx
import Link from "next/link";
import styles from "./resourcesFrame.module.css";

export const NAV = [
  { key: "atm", label: "ATM", href: "/admin-x7k3p9/resources/atm" },
  { key: "heartbeat-of-atoms", label: "Heartbeat of Atoms", href: "/admin-x7k3p9/resources/heartbeat-of-atoms" },
  { key: "lecture", label: "강연자료", href: "/admin-x7k3p9/resources/lecture" },
  { key: "contribution", label: "기고문", href: "/admin-x7k3p9/resources/contribution" },
  { key: "seminar", label: "세미나", href: "/admin-x7k3p9/resources/seminar" },
  { key: "expert-opinion-report", label: "전문가 의견 보고서", href: "/admin-x7k3p9/resources/expert-opinion-report" },
  { key: "essay-contest", label: "에세이 경진대회", href: "/admin-x7k3p9/resources/essay-contest" },
  { key: "shortform-contest", label: "숏폼영상 공모전", href: "/admin-x7k3p9/resources/shortform-contest" },
  { key: "midterm-report", label: "과제 보고회", href: "/admin-x7k3p9/resources/midterm-report" },
  { key: "misc-reports", label: "기타 보고서", href: "/admin-x7k3p9/resources/misc-reports" },
  { key: "workshop", label: "워크샵", href: "/admin-x7k3p9/resources/workshop" },
] as const;

export type ResourceNavKey = typeof NAV[number]["key"];

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
        <div className={styles.sidebarHeader}>
          <div>카테고리</div>
          <form action="/api/admin/logout" method="post" style={{ marginTop: 8 }}>
            <button
              type="submit"
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: "6px 9px",
                background: "#fff",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              로그아웃
            </button>
          </form>
        </div>

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

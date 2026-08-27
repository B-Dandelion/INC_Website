// components/resources/ResourcesFrame.tsx
import Link from "next/link";
import styles from "./resourcesFrame.module.css";
import { getLocale } from "@/lib/i18n";

export const NAV = [
  { key: "atm", label: "ATM", labelEn: "ATM", href: "/resources/atm" },
  { key: "heartbeat-of-atoms", label: "Heartbeat of Atoms", labelEn: "Heartbeat of Atoms", href: "/resources/heartbeat-of-atoms" },
  { key: "lecture", label: "강연자료", labelEn: "Lecture Materials", href: "/resources/lecture" },
  { key: "contribution", label: "기고문", labelEn: "Contributions", href: "/resources/contribution" },
  { key: "seminar", label: "세미나", labelEn: "Seminars", href: "/resources/seminar" },
  { key: "expert-opinion-report", label: "전문가 의견 보고서", labelEn: "Expert Opinion Reports", href: "/resources/expert-opinion-report" },
  { key: "essay-contest", label: "에세이 경진대회", labelEn: "Essay Contest", href: "/resources/essay-contest" },
  { key: "shortform-contest", label: "숏폼영상 공모전", labelEn: "Short-form Video Contest", href: "/resources/shortform-contest" },
  { key: "midterm-report", label: "과제 보고회", labelEn: "Project Progress Reports", href: "/resources/midterm-report" },
  { key: "misc-reports", label: "기타 보고서", labelEn: "Other Reports", href: "/resources/misc-reports" },
  { key: "workshop", label: "워크샵", labelEn: "Workshops", href: "/resources/workshop" },
] as const;

export type ResourceNavKey = typeof NAV[number]["key"];

export default async function ResourcesFrame({
  activeKey,
  sidebarSubmenu,
  children,
}: {
  activeKey: ResourceNavKey;
  sidebarSubmenu?: React.ReactNode;
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const en = locale === "en";

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>{en ? "Categories" : "카테고리"}</div>

        <nav className={styles.nav}>
          {NAV.map((item) => {
            const active = item.key === activeKey;

            return (
              <div key={item.key} className={styles.navGroup}>
                <Link
                  href={item.href}
                  className={`${styles.navItem} ${active ? styles.navActive : ""}`}
                >
                  {en ? item.labelEn : item.label}
                </Link>

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

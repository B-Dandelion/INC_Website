import Link from "next/link";
import styles from "@/components/resources/SimpleListPage.module.css";
import ResourcesFrame, { NAV } from "@/components/resources/AdminResourcesFrame";
import { fetchEvents } from "@/lib/eventsDb";
import { adminSlugToEventCategory } from "@/lib/eventCategoryMap";
import seminarStyles from "@/app/resources/seminar/seminars.module.css";

function fmtPeriod(start?: string | null, end?: string | null) {
  if (!start) return "";
  return end ? `${start} ~ ${end}` : start;
}

export default async function AdminEventsShell({
  slug,
  searchParams,
}: {
  slug: string;
  searchParams: Promise<{ subtype?: string; event?: string }>;
}) {
  const map = adminSlugToEventCategory(slug);
  if (!map) {
    return (
      <div className={styles.card}>
        <div className={styles.muted}>이 카테고리는 행사형이 아닙니다.</div>
      </div>
    );
  }

  const sp = await searchParams;
  const subtype = typeof sp.subtype === "string" ? sp.subtype : undefined;

  // seminar만 subtype 토글 사용
  const events = await fetchEvents({
    category: map.category as any,
    ...(slug === "seminar" && subtype ? { subtype } : {}),
  });

  const selectedEventId =
    (sp.event && events.some((e) => e.id === sp.event) ? sp.event : events[0]?.id) ?? null;

  const boardLabel = NAV.find((x) => x.key === (slug as any))?.label ?? slug;

  const sidebarSubmenu = (
    <div className={seminarStyles.sidebarSub}>
      {/* seminar: 국내/국제 토글 */}
      {slug === "seminar" ? (
        <div className={seminarStyles.segment}>
          <Link
            href={`/admin-x7k3p9/resources/seminar?subtype=domestic`}
            className={`${seminarStyles.segBtn} ${subtype === "domestic" ? seminarStyles.segActive : ""}`}
          >
            국내
          </Link>
          <Link
            href={`/admin-x7k3p9/resources/seminar?subtype=international`}
            className={`${seminarStyles.segBtn} ${subtype === "international" ? seminarStyles.segActive : ""}`}
          >
            국제
          </Link>
        </div>
      ) : null}

      {/* 행사 리스트 */}
      <div className={seminarStyles.eventList}>
        {events.map((e) => {
          const active = e.id === selectedEventId;

          const href =
            `/admin-x7k3p9/resources/${slug}?` +
            new URLSearchParams({
              ...(slug === "seminar" && subtype ? { subtype } : {}),
              event: e.id,
            }).toString();

          return (
            <Link
              key={e.id}
              href={href}
              className={`${seminarStyles.eventItem} ${active ? seminarStyles.eventActive : ""}`}
            >
              <div className={seminarStyles.eventDate}>{fmtPeriod(e.event_date, e.period_end)}</div>
              <div className={seminarStyles.eventName}>{e.title_ko ?? "행사"}</div>
            </Link>
          );
        })}
      </div>

      {/* + 행사 추가 버튼: 세미나 스타일과 같은 톤으로 */}
      <div style={{ marginTop: 10 }}>
        <Link
          href={`/admin-x7k3p9/resources/${slug}/events/new${slug === "seminar" && subtype ? `?subtype=${subtype}` : ""
            }`}
          className={seminarStyles.segBtn}
          style={{ width: "100%", height: 40 }}
        >
          + 행사 추가
        </Link>
      </div>
    </div>
  );

  return (
    <ResourcesFrame
      activeKey={slug as any} sidebarSubmenu={sidebarSubmenu}>
      <div className={styles.content}>
        <div className={styles.hero}>
          <h1 className={styles.h1}>관리: {boardLabel}</h1>
          <div className={styles.meta}>왼쪽에서 행사를 선택하거나 + 행사 추가를 눌러 생성하세요.</div>
        </div>

        {selectedEventId ? (
          <Link
            href={`/admin-x7k3p9/resources/${slug}/events/${selectedEventId}${slug === "seminar" && subtype ? `?subtype=${subtype}` : ""}`}
            className={styles.searchBtn}
            style={{ textDecoration: "none", display: "inline-flex" }}
          >
            행사 상세 관리로 이동 →
          </Link>
        ) : (
          <div className={styles.card}>
            <div className={styles.muted}>행사가 없습니다. 왼쪽에서 + 행사 추가를 눌러 생성하세요.</div>
          </div>
        )}
      </div>
    </ResourcesFrame>
  );
}

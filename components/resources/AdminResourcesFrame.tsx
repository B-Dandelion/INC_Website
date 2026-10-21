// components/resources/AdminResourcesFrame.tsx
import Link from "next/link";
import { Plus } from "lucide-react";
import styles from "./resourcesFrame.module.css";
import seminarStyles from "@/app/resources/seminar/seminars.module.css";
import { BOARD_RULES, eventBoardRule, type EventBoard } from "@/lib/boardRules";
import { fetchAdminEvents } from "@/lib/adminEventsDb";

export const NAV = BOARD_RULES.map((rule) => ({
  key: rule.slug,
  label: rule.label,
  href: `/admin-x7k3p9/resources/${rule.slug}`,
}));

export type ResourceNavKey = string;

const VISIBILITY_SHORT: Record<string, string> = { member: "회원", admin: "관리자" };

function fmtPeriod(start?: string | null, end?: string | null) {
  if (!start) return "날짜 미정";
  return end && end !== start ? `${start} ~ ${end}` : start;
}

export function eventHref(slug: string, eventId: string) {
  return `/admin-x7k3p9/resources/${slug}/events/${eventId}`;
}

export function newEventHref(slug: string, subtype?: string) {
  return `/admin-x7k3p9/resources/${slug}/events/new${subtype ? `?subtype=${subtype}` : ""}`;
}

// The active event board always lists its events (with the subtype switch for
// seminar and project reports), on the board page, an event page, and the new
// event page alike, so the admin can move between events without going back.
async function EventSubmenu({ rule, subtype, activeEventId }: { rule: EventBoard; subtype?: string; activeEventId?: string }) {
  const current = rule.subtypes ? (rule.subtypes.some((s) => s.value === subtype) ? subtype : rule.defaultSubtype) : undefined;
  const events = await fetchAdminEvents(rule.category, current);

  return (
    <div className={seminarStyles.sidebarSub}>
      {rule.subtypes ? (
        <div className={seminarStyles.segment} role="group" aria-label={`${rule.label} 구분`}>
          {rule.subtypes.map((s) => (
            <Link
              key={s.value}
              href={`/admin-x7k3p9/resources/${rule.slug}?subtype=${s.value}`}
              aria-current={s.value === current ? "true" : undefined}
              className={`${seminarStyles.segBtn} ${s.value === current ? seminarStyles.segActive : ""}`}
            >
              {s.label}
            </Link>
          ))}
        </div>
      ) : null}

      <div className={seminarStyles.eventList}>
        {events.length === 0 ? (
          <div className="px-3 py-3 text-xs text-slate-600">등록된 행사가 없습니다.</div>
        ) : (
          events.map((e) => {
            const active = e.id === activeEventId;
            return (
              <Link
                key={e.id}
                href={eventHref(rule.slug, e.id)}
                aria-current={active ? "page" : undefined}
                className={`${seminarStyles.eventItem} ${active ? seminarStyles.eventActive : ""}`}
              >
                <div className={seminarStyles.eventDate}>
                  {fmtPeriod(e.event_date, e.period_end)}
                  {VISIBILITY_SHORT[e.visibility] ? (
                    <span className="ml-1.5 rounded bg-slate-200 px-1 py-px text-[10px] font-bold text-slate-700">{VISIBILITY_SHORT[e.visibility]}</span>
                  ) : null}
                </div>
                <div className={seminarStyles.eventName}>{e.title_ko || "제목 없음"}</div>
              </Link>
            );
          })
        )}
      </div>

      <Link
        href={newEventHref(rule.slug, current)}
        className="mt-2 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-slate-300 text-[13px] font-semibold text-slate-700 transition hover:border-[#2B6CA3] hover:text-[#174A7E]"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />새 행사 추가
      </Link>
    </div>
  );
}

export default function ResourcesFrame({
  activeKey,
  activeEventId,
  subtype,
  children,
}: {
  activeKey: string;
  activeEventId?: string;
  subtype?: string;
  children: React.ReactNode;
}) {
  const activeEventRule = eventBoardRule(activeKey);

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>게시판</div>

        <nav aria-label="게시판" className={styles.nav}>
          {NAV.map((item) => {
            const active = item.key === activeKey;

            return (
              <div key={item.key} className={styles.navGroup}>
                <Link
                  href={item.href}
                  aria-current={active && !activeEventId ? "page" : undefined}
                  className={`${styles.navItem} ${active ? styles.navActive : ""}`}
                >
                  {item.label}
                </Link>

                {active && activeEventRule ? (
                  <div className={styles.submenuWrap}>
                    <EventSubmenu rule={activeEventRule} subtype={subtype} activeEventId={activeEventId} />
                  </div>
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

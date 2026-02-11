// app/resources/project-report/page.tsx
import Link from "next/link";
import ResourcesFrame from "@/components/resources/ResourcesFrame";
import SectionTabs from "@/components/resources/SectionTabs";
import styles from "./projectReport.module.css";
import { fetchEvents, fetchEventAssets } from "@/lib/eventsDb";

const BASE = "/resources/project-report";

function fmtPeriod(start?: string | null, end?: string | null) {
  if (!start) return "";
  return end ? `${start} ~ ${end}` : start;
}

function safeName(a: { person_ko?: string | null; person_en?: string | null }) {
  return (a.person_ko ?? a.person_en ?? "").trim();
}

export default async function ProjectReportPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const sp = await searchParams;

  // category: project_report
  const events = await fetchEvents({ category: "project_report" });

  const selectedEventId =
    (sp.event && events.some((e) => e.id === sp.event) ? sp.event : events[0]?.id) ?? null;

  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;
  const assets = selectedEventId ? await fetchEventAssets(selectedEventId) : [];

  // 역할별 분리
  const poster = assets.find((a) => a.role === "poster_ko") ?? null;

  // 사진(현수막/행사 사진) - 지금은 photo 1개만 들어가도 OK
  const photos = assets.filter((a) => a.role === "photo");
  const heroPhoto = photos[0] ?? null;

  // 자료(교수님 발표자료) : slide로 통일해서 넣었으니 그대로 뽑기
  const slides = assets
    .filter((a) => a.role === "slide")
    .filter((a) => a.resources?.id) // 안전
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const sidebarSubmenu = (
    <div className={styles.submenu}>
      <div className={styles.eventList}>
        {events.length === 0 ? (
          <div className={styles.muted} style={{ padding: 10 }}>
            등록된 행사가 없습니다.
          </div>
        ) : (
          events.map((e) => {
            const active = e.id === selectedEventId;
            return (
              <Link
                key={e.id}
                href={`${BASE}?event=${e.id}`}
                className={`${styles.eventItem} ${active ? styles.eventActive : ""}`}
              >
                <div className={styles.eventDate}>{fmtPeriod(e.event_date, e.period_end)}</div>
                <div className={styles.eventName}>{e.title_ko ?? "행사"}</div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <ResourcesFrame activeKey="reports" sidebarSubmenu={sidebarSubmenu}>
      <div className={styles.content}>
        <div className={styles.hero}>
          <h1 className={styles.h1}>{selectedEvent?.title_ko ?? "과제 보고회"}</h1>
          <div className={styles.meta}>{fmtPeriod(selectedEvent?.event_date, selectedEvent?.period_end)}</div>

          <SectionTabs
            items={[
              { id: "poster", label: "포스터" },
              { id: "photo", label: "사진" },
              { id: "materials", label: "자료" },
            ]}
          />
        </div>

        {!selectedEventId ? (
          <div className={styles.card}>
            <div className={styles.muted}>좌측에서 행사를 선택해 주세요.</div>
          </div>
        ) : (
          <>
            {/* 포스터 */}
            <section id="poster" className={styles.section}>
              <div className={styles.sectionTitle}>포스터</div>

              {poster?.resources?.id ? (
                <div className={styles.posterWrap}>
                  <div className={styles.posterInner}>
                    <img
                      src={`/api/resources/go?id=${poster.resources.id}`}
                      alt={poster.resources.title ?? "poster"}
                      className={styles.posterImg}
                    />
                  </div>
                </div>
              ) : (
                <div className={styles.card}>
                  <div className={styles.muted}>포스터가 없습니다.</div>
                </div>
              )}
            </section>

            {/* 사진 */}
            <section id="photo" className={styles.section}>
              <div className={styles.sectionTitle}>사진</div>

              {heroPhoto?.resources?.id ? (
                <div className={styles.photoLarge}>
                  <div className={styles.photoLabel}>행사 사진</div>
                  <a
                    href={`/api/resources/go?id=${heroPhoto.resources.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.photoLink}
                  >
                    <img
                      src={`/api/resources/go?id=${heroPhoto.resources.id}`}
                      alt={heroPhoto.resources.title ?? "photo"}
                    />
                  </a>
                </div>
              ) : (
                <div className={styles.card}>
                  <div className={styles.muted}>등록된 사진이 없습니다.</div>
                </div>
              )}
            </section>

            {/* 자료 */}
            <section id="materials" className={styles.section}>
              <div className={styles.sectionTitle}>자료</div>

              {slides.length === 0 ? (
                <div className={styles.card}>
                  <div className={styles.muted}>등록된 발표자료가 없습니다.</div>
                </div>
              ) : (
                <div className={styles.board}>
                  <div className={styles.boardHeader}>
                    <div>발표자</div>
                    <div className={styles.boardRight}>자료</div>
                  </div>

                  {slides.map((a, i) => {
                    const r = a.resources!;
                    const name = safeName(a) || r.title || "발표자료";
                    const openUrl = `/api/resources/go?id=${r.id}`;

                    return (
                      <div key={`${r.id}-${i}`} className={styles.boardRow}>
                        <div className={styles.boardTitle}>{name}</div>
                        <div className={styles.boardRight}>
                          <a className={styles.openBtn} href={openUrl} target="_blank" rel="noreferrer">
                            열기
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </ResourcesFrame>
  );
}

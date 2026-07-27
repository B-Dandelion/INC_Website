// app/resources/project-report/page.tsx
import Link from "next/link";
import ResourcesFrame from "@/components/resources/ResourcesFrame";
import SectionTabs from "@/components/resources/SectionTabs";
import EventPoster from "@/components/resources/EventPoster";
import styles from "./projectReport.module.css";
import { fetchEvents, fetchEventAssets } from "@/lib/eventsDb";

const BASE = "/resources/midterm-report";

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
  const poster =
    assets.find((a) => a.role === "poster_ko") ??
    assets.find((a) => a.role === "poster_en") ??
    null;

  const photos = assets
    .filter((a) => a.role === "photo" && a.resources?.id)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

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
    <ResourcesFrame activeKey="midterm-report" sidebarSubmenu={sidebarSubmenu}>
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

              <div className={styles.posterWrap}>
                <div className={styles.posterInner}>
                  <EventPoster
                    asset={poster}
                    emptyText="포스터가 없습니다."
                    alt="과제 보고회 포스터"
                    imageClassName={styles.posterImg}
                    emptyClassName={styles.card}
                  />
                </div>
              </div>
            </section>

            {/* 사진 */}
            <section id="photo" className={styles.section}>
              <div className={styles.sectionTitle}>사진</div>

              {photos.length === 0 ? (
                <div className={styles.card}>
                  <div className={styles.muted}>등록된 사진이 없습니다.</div>
                </div>
              ) : (
                <div className={styles.photoGrid}>
                  {photos.map((photo, index) => {
                    const resource = photo.resources;
                    if (!resource?.id) return null;

                    const href = `/api/resources/go?id=${resource.id}`;
                    const label =
                      resource.title ??
                      resource.original_filename ??
                      `행사 사진 ${index + 1}`;

                    return (
                      <a
                        key={`${resource.id}-${index}`}
                        className={styles.photoItem}
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        title={`${label} 크게 보기`}
                      >
                        <img src={href} alt={label} loading="lazy" />
                        <div className={styles.photoCaption}>{label}</div>
                      </a>
                    );
                  })}
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

import Link from "next/link";
import styles from "./seminars.module.css";
import { fetchEvents, fetchEventAssets } from "@/lib/eventsDb";
import ResourcesFrame from "@/components/resources/ResourcesFrame";
import SectionTabs from "@/components/resources/SectionTabs";

function fmtDate(dateStr?: string | null) {
  return dateStr ?? "";
}

export default async function SeminarsPage({
  searchParams,
}: {
  searchParams: Promise<{ sub?: string; event?: string }>;
}) {
  const sp = await searchParams;

  // sub 기본값은 international
  const sub = sp.sub === "domestic" ? "domestic" : "international";

  const events = await fetchEvents({ category: "seminar", subtype: sub });

  const selectedEventId =
    (sp.event && events.some((e) => e.id === sp.event) ? sp.event : events[0]?.id) ?? null;

  const assets = selectedEventId ? await fetchEventAssets(selectedEventId) : [];
  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;

  const poster =
    assets.find((a) => a.role === "poster_ko") ??
    assets.find((a) => a.role === "poster_en") ??
    null;

  const timetable = assets.find((a) => a.role === "timetable") ?? null;
  const photos = assets.filter((a) => a.role === "photo");
  const slides = assets.filter((a) => a.role === "slide");

  // 세미나 선택됐을 때만 펼쳐질 서브메뉴(국내/국제 + 행사 리스트)
  const sidebarSubmenu = (
    <div className={styles.sidebarSub}>
      <div className={styles.segment}>
        <Link
          href={`/resources/seminars?sub=domestic`}
          className={`${styles.segBtn} ${sub === "domestic" ? styles.segActive : ""}`}
        >
          국내
        </Link>
        <Link
          href={`/resources/seminars?sub=international`}
          className={`${styles.segBtn} ${sub === "international" ? styles.segActive : ""}`}
        >
          국제
        </Link>
      </div>

      <div className={styles.eventList}>
        {events.length === 0 ? (
          <div className={styles.muted} style={{ padding: 12 }}>
            등록된 세미나가 없습니다.
          </div>
        ) : (
          events.map((e) => {
            const active = e.id === selectedEventId;
            return (
              <Link
                key={e.id}
                href={`/resources/seminars?sub=${sub}&event=${e.id}`}
                className={`${styles.eventItem} ${active ? styles.eventActive : ""}`}
              >
                <div className={styles.eventDate}>{fmtDate(e.event_date)}</div>
                <div className={styles.eventName}>{e.title_ko}</div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <ResourcesFrame activeKey="seminar" sidebarSubmenu={sidebarSubmenu}>
      {/* RIGHT */}
      <div className={styles.right}>
        <div className={styles.content}>
          <div className={styles.hero}>
            <h1 className={styles.h1}>{selectedEvent?.title_ko ?? "세미나"}</h1>

            <div className={styles.meta}>
              {selectedEvent?.event_date ? selectedEvent.event_date : ""}
            </div>

            <SectionTabs
              items={[
                { id: "poster", label: "포스터" },
                { id: "timetable", label: "시간표" },
                { id: "photo", label: "사진" },
                { id: "materials", label: "자료" },
              ]}
            />
          </div>

          {!selectedEventId ? (
            <div className={styles.card}>
              <div className={styles.muted}>좌측에서 세미나를 선택해 주세요.</div>
            </div>
          ) : (
            <>
              {/* 포스터 */}
              <section id="poster" className={styles.section}>
                <div className={styles.sectionTitle}>포스터</div>
                <div className={styles.posterWrap}>
                  <div className={styles.posterInner}>
                    {poster?.resources ? (
                      <img
                        src={`/api/resources/go?id=${poster.resources.id}`}
                        alt={poster.resources.title ?? "poster"}
                        className={styles.posterImg}
                      />
                    ) : (
                      <div className={styles.card}>
                        <div className={styles.muted}>포스터가 없습니다.</div>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* 시간표 */}
              <section id="timetable" className={styles.section}>
                <div className={styles.sectionTitle}>시간표</div>
                <div className={styles.card}>
                  {timetable?.resources ? (
                    <a
                      href={`/api/resources/go?id=${timetable.resources.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      시간표 다운로드 (
                      {timetable.resources.original_filename ??
                        timetable.resources.title ??
                        "file"}
                      )
                    </a>
                  ) : (
                    <div className={styles.muted}>시간표가 없습니다.</div>
                  )}
                </div>
              </section>

              {/* 사진 */}
              <section id="photo" className={styles.section}>
                <div className={styles.sectionTitle}>사진</div>
                <div className={styles.card}>
                  {photos.length === 0 ? (
                    <div className={styles.muted}>등록된 사진이 없습니다.</div>
                  ) : (
                    "TODO: 갤러리"
                  )}
                </div>
              </section>

              {/* 자료 */}
              <section id="materials" className={styles.section}>
                <div className={styles.sectionTitle}>자료</div>
                <div className={styles.card}>
                  {slides.length === 0 ? (
                    <div className={styles.muted}>등록된 자료가 없습니다.</div>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {slides.map((s) => {
                        const r = s.resources;
                        if (!r) return null;

                        const label =
                          s.item_title_ko ?? r.title ?? r.original_filename ?? `자료 ${r.id}`;

                        return (
                          <li key={r.id}>
                            <a
                              href={`/api/resources/go?id=${r.id}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {label}
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </ResourcesFrame>
  );
}
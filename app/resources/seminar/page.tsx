import Link from "next/link";
import styles from "./seminars.module.css";
import { fetchEvents, fetchEventAssets } from "@/lib/eventsDb";
import ResourcesFrame from "@/components/resources/ResourcesFrame";
import SectionTabs from "@/components/resources/SectionTabs";
import EventPoster from "@/components/resources/EventPoster";

function fmtDate(dateStr?: string | null) {
  return dateStr ?? "";
}

export default async function SeminarsPage({
  searchParams,
}: {
  searchParams: Promise<{ sub?: string; event?: string }>;
}) {
  const sp = await searchParams;
  const sub = sp.sub === "domestic" ? "domestic" : "international";

  const events = await fetchEvents({ category: "seminar", subtype: sub });

  const selectedEventId =
    (sp.event && events.some((e) => e.id === sp.event)
      ? sp.event
      : events[0]?.id) ?? null;

  const assets = selectedEventId ? await fetchEventAssets(selectedEventId) : [];
  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;

  const poster =
    assets.find((a) => a.role === "poster_ko") ??
    assets.find((a) => a.role === "poster_en") ??
    null;
  const timetable = assets.find((a) => a.role === "timetable") ?? null;
  const photos = assets.filter((a) => a.role === "photo");
  const slides = assets.filter((a) => a.role === "slide");

  const availableTabs = [
    poster ? { id: "poster", label: "포스터" } : null,
    timetable?.resources ? { id: "timetable", label: "시간표" } : null,
    photos.length > 0 ? { id: "photo", label: "사진" } : null,
    slides.length > 0 ? { id: "materials", label: "자료" } : null,
  ].filter(Boolean) as { id: string; label: string }[];

  const sidebarSubmenu = (
    <div className={styles.sidebarSub}>
      <div className={styles.segment}>
        <Link
          href="/resources/seminar?sub=domestic"
          className={`${styles.segBtn} ${sub === "domestic" ? styles.segActive : ""}`}
        >
          국내
        </Link>
        <Link
          href="/resources/seminar?sub=international"
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
                href={`/resources/seminar?sub=${sub}&event=${e.id}`}
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
      <div className={styles.right}>
        <div className={styles.content}>
          <div className={styles.hero}>
            <div className={styles.eyebrow}>Seminar</div>
            <h1 className={styles.h1}>{selectedEvent?.title_ko ?? "세미나"}</h1>
            {selectedEvent?.event_date ? (
              <div className={styles.meta}>{selectedEvent.event_date}</div>
            ) : null}
            {availableTabs.length > 0 ? <SectionTabs items={availableTabs} /> : null}
          </div>

          {!selectedEventId ? (
            <div className={styles.card}>
              <div className={styles.muted}>좌측에서 세미나를 선택해 주세요.</div>
            </div>
          ) : availableTabs.length === 0 ? (
            <div className={styles.emptyState}>
              <strong>등록된 세부 자료가 없습니다.</strong>
              <span>행사 정보가 추가되면 이 영역에 바로 표시됩니다.</span>
            </div>
          ) : (
            <>
              {poster ? (
                <section id="poster" className={styles.section}>
                  <div className={styles.sectionTitle}>포스터</div>
                  <div className={styles.posterWrap}>
                    <div className={styles.posterInner}>
                      <EventPoster
                        asset={poster}
                        emptyText=""
                        alt="세미나 포스터"
                        imageClassName={styles.posterImg}
                        emptyClassName={styles.card}
                      />
                    </div>
                  </div>
                </section>
              ) : null}

              {timetable?.resources ? (
                <section id="timetable" className={styles.section}>
                  <div className={styles.sectionTitle}>시간표</div>
                  <a
                    className={styles.fileLink}
                    href={`/api/resources/go?id=${timetable.resources.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>시간표 다운로드</span>
                    <small>
                      {timetable.resources.original_filename ??
                        timetable.resources.title ??
                        "file"}
                    </small>
                  </a>
                </section>
              ) : null}

              {photos.length > 0 ? (
                <section id="photo" className={styles.section}>
                  <div className={styles.sectionTitle}>사진</div>
                  <div className={styles.photoGrid}>
                    {photos.map((photo, index) => {
                      const resource = photo.resources;
                      if (!resource?.id) return null;

                      const label =
                        resource.title ??
                        resource.original_filename ??
                        `세미나 사진 ${index + 1}`;

                      return (
                        <a
                          key={`${resource.id}-${index}`}
                          className={styles.photoItem}
                          href={`/api/resources/go?id=${resource.id}`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`${label} 크게 보기`}
                        >
                          <img
                            src={`/api/resources/go?id=${resource.id}`}
                            alt={label}
                            loading="lazy"
                          />
                          <div className={styles.photoCaption}>{label}</div>
                        </a>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              {slides.length > 0 ? (
                <section id="materials" className={styles.section}>
                  <div className={styles.sectionTitle}>자료</div>
                  <div className={styles.materialList}>
                    {slides.map((s) => {
                      const r = s.resources;
                      if (!r) return null;

                      const label =
                        s.item_title_ko ??
                        r.title ??
                        r.original_filename ??
                        `자료 ${r.id}`;

                      return (
                        <a
                          key={r.id}
                          className={styles.materialItem}
                          href={`/api/resources/go?id=${r.id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <span>{label}</span>
                          <span aria-hidden>↗</span>
                        </a>
                      );
                    })}
                  </div>
                </section>
              ) : null}
            </>
          )}
        </div>
      </div>
    </ResourcesFrame>
  );
}

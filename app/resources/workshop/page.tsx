// app/resources/workshop/page.tsx
import Link from "next/link";
import ResourcesFrame from "@/components/resources/ResourcesFrame";
import SectionTabs from "@/components/resources/SectionTabs";
import styles from "./workshop.module.css";
import { fetchEvents, fetchEventAssets } from "@/lib/eventsDb";

const BASE = "/resources/workshop";

function fmtPeriod(start?: string | null, end?: string | null) {
  if (!start) return "";
  return end ? `${start} ~ ${end}` : start;
}

function isImageLike(mime?: string | null, filename?: string | null) {
  if (mime?.startsWith("image/")) return true;
  const f = (filename ?? "").toLowerCase();
  return /\.(jpg|jpeg|png|webp|gif)$/i.test(f);
}

export default async function WorkshopPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const sp = await searchParams;

  const events = await fetchEvents({ category: "workshop" });

  const selectedEventId =
    (sp.event && events.some((e) => e.id === sp.event) ? sp.event : events[0]?.id) ?? null;

  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;
  const assets = selectedEventId ? await fetchEventAssets(selectedEventId) : [];

  // optional sections (없으면 안내만)
  const posterKo = assets.find((a) => a.role === "poster_ko") ?? null;
  const posterEn = assets.find((a) => a.role === "poster_en") ?? null;
  const timetable = assets.find((a) => a.role === "timetable") ?? null;

  // photos + materials
  const photos = assets.filter((a) => a.role === "photo" && a.resources?.id);
  const materials = assets
    .filter((a) => a.role === "slide" && a.resources?.id)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  // sidebar submenu
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

  const renderAssetAsMedia = (asset: any, emptyMsg: string) => {
    const r = asset?.resources;
    if (!r?.id) {
      return (
        <div className={styles.card}>
          <div className={styles.muted}>{emptyMsg}</div>
        </div>
      );
    }

    const href = `/api/resources/go?id=${r.id}`;
    const title = r.title ?? r.original_filename ?? "file";
    const img = isImageLike(r.mime, r.original_filename);

    return img ? (
      <a className={styles.mediaWrap} href={href} target="_blank" rel="noreferrer" title={title}>
        <img className={styles.mediaImg} src={href} alt={title} />
      </a>
    ) : (
      <div className={styles.card}>
        <a className={styles.linkBtn} href={href} target="_blank" rel="noreferrer">
          {title} 열기
        </a>
      </div>
    );
  };

  return (
    <ResourcesFrame activeKey="workshop" sidebarSubmenu={sidebarSubmenu}>
      <div className={styles.content}>
        <div className={styles.hero}>
          <h1 className={styles.h1}>{selectedEvent?.title_ko ?? "워크샵"}</h1>
          <div className={styles.meta}>{fmtPeriod(selectedEvent?.event_date, selectedEvent?.period_end)}</div>

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
            <div className={styles.muted}>좌측에서 행사를 선택해 주세요.</div>
          </div>
        ) : (
          <>
            {/* 포스터 */}
            <section id="poster" className={styles.section}>
              <div className={styles.sectionTitle}>포스터</div>

              <div className={styles.posterGrid}>
                <div className={styles.posterBlock}>
                  <div className={styles.posterLabel}>국문</div>
                  {renderAssetAsMedia(posterKo, "등록된 포스터가 없습니다.")}
                </div>
                <div className={styles.posterBlock}>
                  <div className={styles.posterLabel}>영문</div>
                  {renderAssetAsMedia(posterEn, "등록된 포스터가 없습니다.")}
                </div>
              </div>
            </section>

            {/* 시간표 */}
            <section id="timetable" className={styles.section}>
              <div className={styles.sectionTitle}>시간표</div>
              {renderAssetAsMedia(timetable, "등록된 시간표가 없습니다.")}
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
                  {photos.map((p, i) => {
                    const r = p.resources!;
                    const href = `/api/resources/go?id=${r.id}`;
                    const title = r.title ?? r.original_filename ?? "photo";
                    return (
                      <a
                        key={`${r.id ?? i}`}
                        className={styles.photoThumb}
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        title={title}
                      >
                        <img src={href} alt={title} />
                      </a>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 자료 */}
            <section id="materials" className={styles.section}>
              <div className={styles.sectionTitle}>자료</div>

              {materials.length === 0 ? (
                <div className={styles.card}>
                  <div className={styles.muted}>등록된 자료가 없습니다.</div>
                </div>
              ) : (
                <div className={styles.board}>
                  <div className={styles.boardHead}>
                    <div>응모/발제 자료</div>
                    <div className={styles.boardCount}>{materials.length}건</div>
                  </div>

                  <ul className={styles.boardList}>
                    {materials.map((a, i) => {
                      const r = a.resources!;
                      const href = `/api/resources/go?id=${r.id}`;
                      const title = r.title ?? r.original_filename ?? `자료 ${i + 1}`;
                      return (
                        <li key={`${r.id ?? i}`} className={styles.boardRow}>
                          <a className={styles.boardLink} href={href} target="_blank" rel="noreferrer">
                            {title}
                          </a>
                          <span className={styles.boardMeta}>PDF</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </ResourcesFrame>
  );
}

// app/resources/essay/page.tsx
import Link from "next/link";
import ResourcesFrame from "@/components/resources/ResourcesFrame";
import styles from "./essayContest.module.css";
import { fetchEvents, fetchEventAssets } from "@/lib/eventsDb";
import SectionTabs from "@/components/resources/SectionTabs";


function fmtDate(dateStr?: string | null) {
  return dateStr ?? "";
}

function awardLabel(raw?: string | null) {
  if (!raw) return "수상";
  const v = raw.toLowerCase();
  if (v === "grand" || v === "grand_prize") return "대상";
  if (v === "gold") return "금상";
  if (v === "silver") return "은상";
  if (v === "bronze") return "동상";
  if (v === "encouragement" || v === "honorable") return "장려상";
  // DB에 이미 "금상" 같은 한글로 넣어둔 경우 그대로
  return raw;
}

const AWARD_ORDER = ["grand", "gold", "silver", "bronze", "encouragement"];

function awardRank(raw?: string | null) {
  if (!raw) return 999;
  const v = raw.toLowerCase();
  const idx = AWARD_ORDER.indexOf(v);
  return idx === -1 ? 998 : idx;
}

export default async function EssayContestPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const sp = await searchParams;

  const events = await fetchEvents({ category: "essay_contest" });

  const selectedEventId =
    (sp.event && events.some((e) => e.id === sp.event) ? sp.event : events[0]?.id) ?? null;

  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;
  const assets = selectedEventId ? await fetchEventAssets(selectedEventId) : [];

  const posterKo = assets.find((a) => a.role === "poster_ko") ?? null;
  const posterEn = assets.find((a) => a.role === "poster_en") ?? null;

  const winnerPhotos = assets.filter((a) => a.role === "winner_photo");
  // 수상작은 role=slide 재사용 + award가 있는 것만
  const winnerDocs = assets
    .filter((a) => a.role === "slide" && !!a.award)
    .sort((a, b) => {
      const ra = awardRank(a.award);
      const rb = awardRank(b.award);
      if (ra !== rb) return ra - rb;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });

  // 행사 사진(선택): photo 중 winner_photo 제외한 것만
  const photos = assets.filter((a) => a.role === "photo");

  // 서브메뉴(좌측): 행사 리스트
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
                href={`/resources/essay?event=${e.id}`}
                className={`${styles.eventItem} ${active ? styles.eventActive : ""}`}
              >
                <div className={styles.eventDate}>{fmtDate(e.event_date)}</div>
                <div className={styles.eventName}>{e.title_ko ?? "행사"}</div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <ResourcesFrame activeKey="essay" sidebarSubmenu={sidebarSubmenu}>
      <div className={styles.content}>
        <div className={styles.hero}>
          <h1 className={styles.h1}>{selectedEvent?.title_ko ?? "에세이 경진대회"}</h1>
          <div className={styles.meta}>{selectedEvent?.event_date ? selectedEvent.event_date : ""}</div>
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
                  <div className={styles.posterWrap}>
                    <div className={styles.posterInner}>
                      {posterKo?.resources ? (
                        <img
                          src={`/api/resources/go?id=${posterKo.resources.id}`}
                          alt={posterKo.resources.title ?? "poster_ko"}
                          className={styles.posterImg}
                        />
                      ) : (
                        <div className={styles.card}>
                          <div className={styles.muted}>국문 포스터가 없습니다.</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className={styles.posterBlock}>
                  <div className={styles.posterLabel}>영문</div>
                  <div className={styles.posterWrap}>
                    <div className={styles.posterInner}>
                      {posterEn?.resources ? (
                        <img
                          src={`/api/resources/go?id=${posterEn.resources.id}`}
                          alt={posterEn.resources.title ?? "poster_en"}
                          className={styles.posterImg}
                        />
                      ) : (
                        <div className={styles.card}>
                          <div className={styles.muted}>영문 포스터가 없습니다.</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 수상자 */}
            <section id="winners" className={styles.section}>
              <div className={styles.sectionTitle}>수상자</div>

              {winnerDocs.length === 0 && winnerPhotos.length === 0 ? (
                <div className={styles.card}>
                  <div className={styles.muted}>등록된 수상자 정보가 없습니다.</div>
                </div>
              ) : (
                <div className={styles.winnerGrid}>
                  {winnerDocs.map((w, idx) => {
                    const r = w.resources;
                    const name = w.person_ko ?? "";
                    const title = w.item_title_ko ?? r?.title ?? r?.original_filename ?? `자료 ${r?.id ?? ""}`;
                    const badge = awardLabel(w.award);

                    const photo =
                      name
                        ? winnerPhotos.find((p) => (p.person_ko ?? "") === name)?.resources
                        : null;

                    return (
                      <div key={`${r?.id ?? idx}`} className={styles.winnerCard}>
                        <div className={styles.winnerTop}>
                          <span className={styles.badge}>{badge}</span>
                          {name ? <span className={styles.winnerName}>{name}</span> : null}
                        </div>

                        <div className={styles.winnerBody}>
                          <div className={styles.winnerPhoto}>
                            {photo?.id ? (
                              <img
                                src={`/api/resources/go?id=${photo.id}`}
                                alt={photo.title ?? "winner_photo"}
                              />
                            ) : (
                              <div className={styles.winnerPhotoEmpty}>사진 없음</div>
                            )}
                          </div>

                          <div className={styles.winnerInfo}>
                            {r?.id ? (
                              <a
                                className={styles.winnerLink}
                                href={`/api/resources/go?id=${r.id}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {title}
                              </a>
                            ) : (
                              <div className={styles.muted}>{title}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 사진 */}
            <section id="photo" className={styles.section}>
              <div className={styles.sectionTitle}>사진</div>
              <div className={styles.card}>
                {photos.length === 0 ? <div className={styles.muted}>등록된 사진이 없습니다.</div> : "TODO: 갤러리"}
              </div>
            </section>

            {/* 자료 */}
            <section id="materials" className={styles.section}>
              <div className={styles.sectionTitle}>자료</div>
              <div className={styles.card}>
                {/* 여기서는 award 없는 slide(행사자료/공지 등)가 있으면 보여주고 싶으면 분리해서 렌더 */}
                <div className={styles.muted}>추가 자료가 있다면 여기에 노출</div>
              </div>
            </section>
          </>
        )}
      </div>
    </ResourcesFrame>
  );
}
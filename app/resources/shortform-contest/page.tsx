// app/resources/shortform/page.tsx
import Link from "next/link";
import ResourcesFrame from "@/components/resources/ResourcesFrame";
import SectionTabs from "@/components/resources/SectionTabs";
import { fetchEvents, fetchEventAssets } from "@/lib/eventsDb";
import styles from "../essay-contest/essayContest.module.css";

const BASE = "/resources/shortform";

function fmtPeriod(start?: string | null, end?: string | null) {
  if (!start) return "";
  return end ? `${start} ~ ${end}` : start;
}

function norm(s?: string | null) {
  return (s ?? "").trim().toLowerCase();
}

function awardRank(label?: string | null) {
  const v = (label ?? "").trim();
  if (v === "대상") return 0;
  if (v === "금상") return 1;
  if (v === "은상") return 2;
  if (v === "동상") return 3;
  if (v === "장려상") return 4;
  return 99;
}

export default async function ShortformContestPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const sp = await searchParams;

  const events = await fetchEvents({ category: "shortform_contest" });

  const selectedEventId =
    (sp.event && events.some((e) => e.id === sp.event) ? sp.event : events[0]?.id) ?? null;

  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;
  const assets = selectedEventId ? await fetchEventAssets(selectedEventId) : [];

  const posterKo = assets.find((a) => a.role === "poster_ko") ?? null;
  const posterEn = assets.find((a) => a.role === "poster_en") ?? null;

  // (있으면) 수상자 구조도 동일하게 사용
  const awardDocs = assets
    .filter((a) => a.role === "award_doc")
    .sort((a, b) => {
      const ra = awardRank(a.award);
      const rb = awardRank(b.award);
      if (ra !== rb) return ra - rb;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });

  const winnerPhotos = assets.filter((a) => a.role === "winner_photo");
  const photoByPerson = new Map<string, any>();
  for (const p of winnerPhotos) {
    const key = norm(p.person_en ?? p.person_ko);
    if (key) photoByPerson.set(key, p);
  }

  const photos = assets.filter((a) => a.role === "photo");
  const groupPhoto =
    photos.find((p) => norm(p.person_en) === "all") ??
    photos.find((p) => (p?.resources?.original_filename ?? "").toLowerCase() === "all.jpg") ??
    null;
  const otherPhotos = photos.filter((p) => p !== groupPhoto);

  // 응모작(영상/파일): 일단 slide로 묶어서 노출 (winner 제외는 person 비교가 있을 때만 동작)
  const winnerNameSet = new Set(awardDocs.map((d) => norm(d.person_en ?? d.person_ko)));
  const slides = assets.filter((a) => a.role === "slide");

  const submissions = slides
    .filter((a) => {
      const personKey = norm(a.person_en ?? a.person_ko);
      if (!personKey) return true; // 이름 없으면 그냥 노출 (어차피 "있는 정보만"이니까)
      return !winnerNameSet.has(personKey);
    })
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
    <ResourcesFrame activeKey="shortform" sidebarSubmenu={sidebarSubmenu}>
      <div className={styles.content}>
        <div className={styles.hero}>
          <h1 className={styles.h1}>{selectedEvent?.title_ko ?? "숏폼영상공모전"}</h1>
          <div className={styles.meta}>{fmtPeriod(selectedEvent?.event_date, selectedEvent?.period_end)}</div>

          <SectionTabs
            items={[
              { id: "poster", label: "포스터" },
              { id: "winners", label: "수상자" },
              { id: "photo", label: "사진" },
              { id: "materials", label: "응모작" },
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
                      {posterKo?.resources?.id ? (
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
                      {posterEn?.resources?.id ? (
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

            {/* 수상자 (없으면 비어있게) */}
            <section id="winners" className={styles.section}>
              <div className={styles.sectionTitle}>수상자</div>

              {awardDocs.length === 0 ? (
                <div className={styles.card}>
                  <div className={styles.muted}>등록된 수상자 정보가 없습니다.</div>
                </div>
              ) : (
                <div className={styles.winnerGrid}>
                  {awardDocs.map((w, idx) => {
                    const person = (w.person_en ?? w.person_ko ?? "").trim() || "수상자";
                    const personKey = norm(person);
                    const photoAsset = photoByPerson.get(personKey) ?? null;
                    const doc = w.resources;

                    return (
                      <div key={`${doc?.id ?? idx}`} className={styles.winnerCard}>
                        <div className={styles.winnerTop}>
                          <span className={styles.badge}>{w.award ?? "수상"}</span>
                          <span className={styles.winnerName}>{person}</span>
                        </div>

                        <div className={styles.winnerBody}>
                          <div className={styles.winnerPhoto}>
                            {photoAsset?.resources?.id ? (
                              <a href={`/api/resources/go?id=${photoAsset.resources.id}`} target="_blank" rel="noreferrer">
                                <img
                                  src={`/api/resources/go?id=${photoAsset.resources.id}`}
                                  alt={photoAsset.resources.title ?? "winner_photo"}
                                />
                              </a>
                            ) : (
                              <div className={styles.winnerPhotoEmpty}>사진 없음</div>
                            )}
                          </div>

                          <div className={styles.winnerInfo}>
                            {doc?.id ? (
                              <a
                                className={styles.winnerLink}
                                href={`/api/resources/go?id=${doc.id}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                응모작 열기
                              </a>
                            ) : (
                              <div className={styles.muted}>응모작이 없습니다.</div>
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

              {photos.length === 0 ? (
                <div className={styles.card}>
                  <div className={styles.muted}>등록된 사진이 없습니다.</div>
                </div>
              ) : (
                <>
                  {groupPhoto?.resources?.id ? (
                    <div className={styles.photoLarge}>
                      <div className={styles.photoLabel}>단체 사진</div>
                      <a href={`/api/resources/go?id=${groupPhoto.resources.id}`} target="_blank" rel="noreferrer">
                        <img
                          src={`/api/resources/go?id=${groupPhoto.resources.id}`}
                          alt={groupPhoto.resources.title ?? "group_photo"}
                        />
                      </a>
                    </div>
                  ) : null}

                  {otherPhotos.length > 0 ? (
                    <div className={styles.photoGrid}>
                      {otherPhotos.map((p, i) => {
                        const rid = p.resources?.id;
                        if (!rid) return null;
                        return (
                          <a
                            key={`${rid}-${i}`}
                            className={styles.photoThumb}
                            href={`/api/resources/go?id=${rid}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <img src={`/api/resources/go?id=${rid}`} alt={p.resources?.title ?? "photo"} />
                          </a>
                        );
                      })}
                    </div>
                  ) : null}
                </>
              )}
            </section>

            {/* 응모작 */}
            <section id="materials" className={styles.section}>
              <div className={styles.sectionTitle}>응모작</div>

              {submissions.length === 0 ? (
                <div className={styles.card}>
                  <div className={styles.muted}>등록된 응모작이 없습니다.</div>
                </div>
              ) : (
                <ul className={styles.materialsList}>
                  {submissions.map((a, i) => {
                    const person = (a.person_en ?? a.person_ko ?? "").trim();
                    const label = person || a.resources?.title || a.resources?.original_filename || "응모작";
                    const rid = a.resources?.id;
                    if (!rid) return null;

                    return (
                      <li key={`${rid}-${i}`} className={styles.materialRow}>
                        <a
                          className={styles.materialLink}
                          href={`/api/resources/go?id=${rid}`}
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
            </section>
          </>
        )}
      </div>
    </ResourcesFrame>
  );
}

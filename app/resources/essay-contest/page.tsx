// app/resources/essay-contest/page.tsx
import Link from "next/link";
import ResourcesFrame from "@/components/resources/ResourcesFrame";
import SectionTabs from "@/components/resources/SectionTabs";
import EventPoster from "@/components/resources/EventPoster";
import styles from "./essayContest.module.css";
import { fetchEvents, fetchEventAssets } from "@/lib/eventsDb";

const BASE = "/resources/essay-contest";

function norm(s?: string | null) {
  return (s ?? "").trim().toLowerCase();
}

function fmtPeriod(start?: string | null, end?: string | null) {
  if (!start) return "";
  return end ? `${start} ~ ${end}` : start;
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

function isAiStatement(a: any) {
  const t = `${a?.item_title_en ?? ""} ${a?.resources?.title ?? ""} ${a?.resources?.original_filename ?? ""}`.toLowerCase();
  return t.includes("ai statement");
}

// 사람당 여러 파일(예: ai statement + essay)이 들어오는 경우, 더 “좋은” 파일 하나만 고르기
function pickBetter(cur: any, next: any) {
  if (!cur) return next;
  const curName = (cur?.resources?.original_filename ?? "").toLowerCase();
  const nextName = (next?.resources?.original_filename ?? "").toLowerCase();
  const curIsPdf = curName.endsWith(".pdf");
  const nextIsPdf = nextName.endsWith(".pdf");
  if (curIsPdf !== nextIsPdf) return nextIsPdf ? next : cur;

  const curSort = cur?.sort_order ?? 0;
  const nextSort = next?.sort_order ?? 0;
  if (curSort !== nextSort) return nextSort < curSort ? next : cur;

  const curId = cur?.resources?.id ?? 0;
  const nextId = next?.resources?.id ?? 0;
  return nextId < curId ? next : cur;
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

  // posters
  const posterKo = assets.find((a) => a.role === "poster_ko") ?? null;
  const posterEn = assets.find((a) => a.role === "poster_en") ?? null;

  // winners (B안): award_doc(수상작 링크) + winner_photo(얼굴)
  const rawAwardDocs = assets.filter((a) => a.role === "award_doc");

  // ★ 사람당 1개만 남기기 (중복/AI statement 섞여도 안정)
  const awardDocByPerson = new Map<string, any>();
  for (const d of rawAwardDocs) {
    const key = norm(d.person_en ?? d.person_ko);
    if (!key) continue;
    if (isAiStatement(d)) continue; // 혹시 award_doc에 ai statement가 들어오면 제외
    awardDocByPerson.set(key, pickBetter(awardDocByPerson.get(key), d));
  }

  const awardDocs = Array.from(awardDocByPerson.values()).sort((a, b) => {
    const ra = awardRank(a.award);
    const rb = awardRank(b.award);
    if (ra !== rb) return ra - rb;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });

  const winnerPhotos = assets.filter((a) => a.role === "winner_photo");

  // 사진 매칭용 map (winner_photo)
  const photoByPerson = new Map<string, any>();
  for (const p of winnerPhotos) {
    const key = norm(p.person_en ?? p.person_ko);
    if (key) photoByPerson.set(key, p);
  }

  // photos (단체사진은 여기로)
  const photosRaw = assets.filter((a) => a.role === "photo");
  const photos = photosRaw.filter((p) => !!p?.resources?.id); // resources null 방어

  const groupPhoto =
    photos.find((p) => norm(p.person_en) === "all") ??
    photos.find((p) => (p?.resources?.original_filename ?? "").toLowerCase() === "all.jpg") ??
    null;

  const otherPhotos = photos.filter((p) => p !== groupPhoto);

  // materials: slide 중 "수상자 제외" + "AI Statement 제외" + "사람당 1개만"
  const winnerNameSet = new Set(awardDocs.map((d) => norm(d.person_en ?? d.person_ko)));

  const slides = assets.filter((a) => a.role === "slide");
  const candidates = slides.filter((a) => {
    const personKey = norm(a.person_en ?? a.person_ko);
    if (!personKey) return false;
    if (winnerNameSet.has(personKey)) return false;
    if (isAiStatement(a)) return false;
    if (!a?.resources?.id) return false;
    return true;
  });

  const bestByPerson = new Map<string, any>();
  for (const a of candidates) {
    const key = norm(a.person_en ?? a.person_ko);
    bestByPerson.set(key, pickBetter(bestByPerson.get(key), a));
  }

  const materialItems = Array.from(bestByPerson.values()).sort((a, b) => {
    const an = (a.person_en ?? a.person_ko ?? "").toLowerCase();
    const bn = (b.person_en ?? b.person_ko ?? "").toLowerCase();
    return an.localeCompare(bn);
  });

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

  return (
    <ResourcesFrame activeKey="essay-contest" sidebarSubmenu={sidebarSubmenu}>
      <div className={styles.content}>
        <div className={styles.hero}>
          <h1 className={styles.h1}>{selectedEvent?.title_ko ?? "에세이 경진대회"}</h1>
          <div className={styles.meta}>{fmtPeriod(selectedEvent?.event_date, selectedEvent?.period_end)}</div>

          <SectionTabs
            items={[
              { id: "poster", label: "포스터" },
              { id: "winners", label: "수상자" },
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
                      <EventPoster
                        asset={posterKo}
                        emptyText="국문 포스터가 없습니다."
                        alt="국문 포스터"
                        imageClassName={styles.posterImg}
                        emptyClassName={styles.card}
                      />
                    </div>
                  </div>
                </div>

                <div className={styles.posterBlock}>
                  <div className={styles.posterLabel}>영문</div>
                  <div className={styles.posterWrap}>
                    <div className={styles.posterInner}>
                      <EventPoster
                        asset={posterEn}
                        emptyText="영문 포스터가 없습니다."
                        alt="영문 포스터"
                        imageClassName={styles.posterImg}
                        emptyClassName={styles.card}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 수상자 */}
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

                    const photoAsset =
                      photoByPerson.get(personKey) ??
                      winnerPhotos.find((p) => {
                        const pk = norm(p.person_en ?? p.person_ko);
                        return pk && (personKey.includes(pk) || pk.includes(personKey));
                      }) ??
                      null;

                    const docId = w.resources?.id ?? null;
                    const photoId = photoAsset?.resources?.id ?? null;

                    const docUrl = docId ? `/api/resources/go?id=${docId}` : null;
                    const photoUrl = photoId ? `/api/resources/go?id=${photoId}` : null;

                    return (
                      <div key={`${docId ?? personKey ?? idx}`} className={styles.winnerCard}>
                        {/* 좌측 정보 */}
                        <div className={styles.winnerInfo}>
                          <span className={styles.badge}>{w.award ?? "수상"}</span>

                          {docUrl ? (
                            <a
                              className={styles.winnerNameLink}
                              href={docUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="응모작(PDF) 열기"
                            >
                              {person}
                            </a>
                          ) : (
                            <div className={styles.winnerNameText}>{person}</div>
                          )}

                          <div className={styles.winnerSub}>
                            {docUrl ? (
                              <a className={styles.winnerMiniLink} href={docUrl} target="_blank" rel="noreferrer">
                                응모작 열기 ↗
                              </a>
                            ) : (
                              <span className={styles.muted}>문서 없음</span>
                            )}
                          </div>
                        </div>

                        {/* 우측 큰 사진 */}
                        <div className={styles.winnerPhotoLarge}>
                          {photoUrl ? (
                            <a href={photoUrl} target="_blank" rel="noreferrer" title="사진 원본 열기">
                              <img src={photoUrl} alt={person} />
                            </a>
                          ) : (
                            <div className={styles.winnerPhotoEmpty}>사진 없음</div>
                          )}
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
                      <img
                        src={`/api/resources/go?id=${groupPhoto.resources.id}`}
                        alt={groupPhoto.resources.title ?? "group_photo"}
                      />
                    </div>
                  ) : null}

                  {otherPhotos.length > 0 ? (
                    <div className={styles.photoGrid}>
                      {otherPhotos.map((p, i) => {
                        const rid = p?.resources?.id;
                        if (!rid) return null;

                        const title = p.resources?.title ?? p.resources?.original_filename ?? "photo";
                        return (
                          <a
                            key={rid}
                            className={styles.photoThumb}
                            href={`/api/resources/go?id=${rid}`}
                            target="_blank"
                            rel="noreferrer"
                            title={title}
                          >
                            <img src={`/api/resources/go?id=${rid}`} alt={title} />
                          </a>
                        );
                      })}
                    </div>
                  ) : null}
                </>
              )}
            </section>

            {/* 자료 */}
            <section id="materials" className={styles.section}>
              <div className={styles.sectionTitle}>자료</div>

              {materialItems.length === 0 ? (
                <div className={styles.card}>
                  <div className={styles.muted}>등록된 자료가 없습니다.</div>
                </div>
              ) : (
                <div className={styles.board}>
                  <div className={styles.boardHead}>
                    <div>No</div>
                    <div>지원자</div>
                    <div>열기</div>
                  </div>

                  {materialItems.map((a, i) => {
                    const person = (a.person_en ?? a.person_ko ?? "").trim() || "익명";
                    const r = a.resources;
                    if (!r?.id) return null;

                    return (
                      <div key={`${r.id}`} className={styles.boardRow}>
                        <div className={styles.boardNo}>{i + 1}</div>

                        <div className={styles.boardTitle}>
                          <a href={`/api/resources/go?id=${r.id}`} target="_blank" rel="noreferrer">
                            {person}
                          </a>
                        </div>

                        <div className={styles.boardAction}>
                          <a className={styles.boardBtn} href={`/api/resources/go?id=${r.id}`} target="_blank" rel="noreferrer">
                            PDF ↗
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
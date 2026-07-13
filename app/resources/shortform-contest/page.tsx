// app/resources/shortform-contest/page.tsx
import Link from "next/link";
import ResourcesFrame from "@/components/resources/ResourcesFrame";
import SectionTabs from "@/components/resources/SectionTabs";
import { fetchEvents, fetchEventAssets } from "@/lib/eventsDb";
import styles from "../essay-contest/essayContest.module.css";

const BASE = "/resources/shortform-contest";

function fmtPeriod(start?: string | null, end?: string | null) {
  if (!start) return "";
  return end ? `${start} ~ ${end}` : start;
}

function norm(s?: string | null) {
  return (s ?? "").trim().toLowerCase();
}

function isPdfAsset(asset: any) {
  const mime = norm(asset?.resources?.mime);
  const filename = norm(asset?.resources?.original_filename);

  return mime === "application/pdf" || filename.endsWith(".pdf");
}

function youtubeVideoId(value?: string | null) {
  const input = (value ?? "").trim();
  if (!input) return null;

  try {
    const normalized = /^https?:\/\//i.test(input)
      ? input
      : `https://${input}`;
    const url = new URL(normalized);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();

    let id: string | null = null;

    if (host === "youtu.be") {
      id = url.pathname.split("/").filter(Boolean)[0] ?? null;
    } else if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com"
    ) {
      if (url.pathname === "/watch") {
        id = url.searchParams.get("v");
      } else {
        const match = url.pathname.match(
          /^\/(?:shorts|embed|live)\/([^/?#]+)/
        );
        id = match?.[1] ?? null;
      }
    }

    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function YouTubePreview({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  const videoId = youtubeVideoId(url);
  if (!videoId) return null;

  return (
    <div
      style={{
        width: "100%",
        aspectRatio: "16 / 9",
        overflow: "hidden",
        borderRadius: 12,
        background: "#000",
      }}
    >
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        style={{
          width: "100%",
          height: "100%",
          border: 0,
          display: "block",
        }}
      />
    </div>
  );
}

function PosterContent({
  asset,
  emptyText,
  alt,
}: {
  asset: any;
  emptyText: string;
  alt: string;
}) {
  const resourceId = asset?.resources?.id;

  if (!resourceId) {
    return (
      <div className={styles.card}>
        <div className={styles.muted}>{emptyText}</div>
      </div>
    );
  }

  const href = `/api/resources/go?id=${resourceId}`;

  if (isPdfAsset(asset)) {
    return (
      <div
        className={styles.card}
        style={{
          minHeight: 180,
          display: "grid",
          placeItems: "center",
          textAlign: "center",
          gap: 10,
        }}
      >
        <div style={{ fontWeight: 800 }}>
          {asset.resources.title ?? alt}
        </div>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-block",
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #2563eb",
            color: "#2563eb",
            textDecoration: "none",
            fontWeight: 800,
          }}
        >
          PDF 포스터 열기
        </a>
      </div>
    );
  }

  return (
    <img
      src={href}
      alt={asset.resources.title ?? alt}
      className={styles.posterImg}
    />
  );
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
    <ResourcesFrame activeKey="shortform-contest" sidebarSubmenu={sidebarSubmenu}>
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
                      <PosterContent
                        asset={posterKo}
                        emptyText="국문 포스터가 없습니다."
                        alt="국문 포스터"
                      />
                    </div>
                  </div>
                </div>

                <div className={styles.posterBlock}>
                  <div className={styles.posterLabel}>영문</div>
                  <div className={styles.posterWrap}>
                    <div className={styles.posterInner}>
                      <PosterContent
                        asset={posterEn}
                        emptyText="영문 포스터가 없습니다."
                        alt="영문 포스터"
                      />
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
                    const person =
                      (w.person_en ?? w.person_ko ?? "").trim() ||
                      "수상자";
                    const personKey = norm(person);
                    const photoAsset =
                      photoByPerson.get(personKey) ?? null;
                    const photoResource = photoAsset?.resources ?? null;
                    const doc = w.resources;

                    return (
                      <div
                        key={`${doc?.id ?? idx}`}
                        className={styles.winnerCard}
                        style={{
                          gridTemplateColumns: "1fr",
                          gap: 18,
                          alignItems: "stretch",
                        }}
                      >
                        <div
                          className={styles.winnerTop}
                          style={{
                            justifyContent: "center",
                            marginBottom: 0,
                            textAlign: "center",
                          }}
                        >
                          <span className={styles.badge}>
                            {w.award ?? "수상"}
                          </span>
                          <span className={styles.winnerName}>
                            {person}
                          </span>
                        </div>

                        <div
                          className={styles.winnerBody}
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            justifyContent: "center",
                            alignItems: "center",
                            gap: 20,
                            width: "100%",
                          }}
                        >
                          {photoResource?.id ? (
                            <div
                              className={styles.winnerPhoto}
                              style={{
                                width: 160,
                                height: 160,
                                flex: "0 0 160px",
                              }}
                            >
                              <a
                                href={`/api/resources/go?id=${photoResource.id}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  display: "block",
                                  width: "100%",
                                  height: "100%",
                                }}
                              >
                                <img
                                  src={`/api/resources/go?id=${photoResource.id}`}
                                  alt={
                                    photoResource.title ??
                                    "winner_photo"
                                  }
                                />
                              </a>
                            </div>
                          ) : null}

                          <div
                            className={styles.winnerInfo}
                            style={{
                              flex: "1 1 360px",
                              width: "100%",
                              maxWidth: 640,
                              minWidth: 0,
                              justifySelf: "center",
                              textAlign: "center",
                            }}
                          >
                            {doc?.source_path &&
                            youtubeVideoId(doc.source_path) ? (
                              <div
                                style={{
                                  display: "grid",
                                  gap: 12,
                                  width: "100%",
                                }}
                              >
                                {w.item_title_ko ||
                                w.item_title_en ? (
                                  <div
                                    style={{
                                      fontWeight: 850,
                                      wordBreak: "break-word",
                                    }}
                                  >
                                    {w.item_title_ko ??
                                      w.item_title_en}
                                  </div>
                                ) : null}

                                <YouTubePreview
                                  url={doc.source_path}
                                  title={
                                    w.item_title_ko ??
                                    w.item_title_en ??
                                    `${person} 수상 작품`
                                  }
                                />

                                <a
                                  className={styles.winnerLink}
                                  href={doc.source_path}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    justifySelf: "center",
                                  }}
                                >
                                  유튜브에서 보기
                                </a>
                              </div>
                            ) : doc?.id ? (
                              <a
                                className={styles.winnerLink}
                                href={`/api/resources/go?id=${doc.id}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                응모작 열기
                              </a>
                            ) : (
                              <div className={styles.muted}>
                                응모작이 없습니다.
                              </div>
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
                  <div className={styles.muted}>
                    등록된 응모작이 없습니다.
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 14 }}>
                  {submissions.map((asset, index) => {
                    const person = (
                      asset.person_en ??
                      asset.person_ko ??
                      ""
                    ).trim();
                    const label =
                      (
                        asset.resources?.title ??
                        asset.item_title_ko ??
                        asset.item_title_en ??
                        asset.resources?.original_filename ??
                        "응모작"
                      ).trim() || "응모작";
                    const resourceId = asset.resources?.id;
                    const sourcePath =
                      asset.resources?.source_path ?? "";
                    const videoId = youtubeVideoId(sourcePath);

                    if (!resourceId) return null;

                    return (
                      <div
                        key={`${resourceId}-${index}`}
                        className={styles.card}
                        style={{ display: "grid", gap: 10 }}
                      >
                        <div style={{ fontWeight: 900 }}>
                          {label}
                        </div>

                        {person ? (
                          <div className={styles.muted}>
                            {person}
                          </div>
                        ) : null}

                        {videoId ? (
                          <>
                            <YouTubePreview
                              url={sourcePath}
                              title={label}
                            />
                            <a
                              className={styles.materialLink}
                              href={sourcePath}
                              target="_blank"
                              rel="noreferrer"
                            >
                              유튜브에서 보기
                            </a>
                          </>
                        ) : (
                          <a
                            className={styles.materialLink}
                            href={`/api/resources/go?id=${resourceId}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            응모작 열기
                          </a>
                        )}
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

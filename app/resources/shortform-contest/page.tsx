// app/resources/shortform-contest/page.tsx
import Link from "next/link";
import ResourcesFrame from "@/components/resources/ResourcesFrame";
import SectionTabs from "@/components/resources/SectionTabs";
import { fetchEvents, fetchEventAssets } from "@/lib/eventsDb";
import styles from "../essay-contest/essayContest.module.css";
import { getLocale } from "@/lib/i18n";

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
    const normalized = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    const url = new URL(normalized);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    let id: string | null = null;
    if (host === "youtu.be") id = url.pathname.split("/").filter(Boolean)[0] ?? null;
    else if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (url.pathname === "/watch") id = url.searchParams.get("v");
      else id = url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/)?.[1] ?? null;
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function YouTubePreview({ url, title }: { url: string; title: string }) {
  const videoId = youtubeVideoId(url);
  if (!videoId) return null;
  return (
    <div style={{ width: "100%", aspectRatio: "16 / 9", overflow: "hidden", borderRadius: 3, background: "#000" }}>
      <iframe src={`https://www.youtube-nocookie.com/embed/${videoId}`} title={title} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen style={{ width: "100%", height: "100%", border: 0, display: "block" }} />
    </div>
  );
}

function PosterContent({ asset, alt, openLabel }: { asset: any; alt: string; openLabel: string }) {
  const resourceId = asset?.resources?.id;
  if (!resourceId) return null;
  const href = `/api/resources/go?id=${resourceId}`;
  if (isPdfAsset(asset)) {
    return (
      <div className={styles.card} style={{ minHeight: 180, display: "grid", placeItems: "center", textAlign: "center", gap: 12 }}>
        <div style={{ fontWeight: 700, color: "#263244" }}>{asset.resources.title ?? alt}</div>
        <a href={href} target="_blank" rel="noreferrer" className={styles.materialLink}>{openLabel}</a>
      </div>
    );
  }
  return <img src={href} alt={asset.resources.title ?? alt} className={styles.posterImg} />;
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

export default async function ShortformContestPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const locale = await getLocale();
  const en = locale === "en";
  const sp = await searchParams;
  const events = await fetchEvents({ category: "shortform_contest" });
  const selectedEventId = (sp.event && events.some((e) => e.id === sp.event) ? sp.event : events[0]?.id) ?? null;
  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;
  const assets = selectedEventId ? await fetchEventAssets(selectedEventId) : [];

  const posterKo = assets.find((a) => a.role === "poster_ko") ?? null;
  const posterEn = assets.find((a) => a.role === "poster_en") ?? null;
  const awardDocs = assets.filter((a) => a.role === "award_doc").sort((a, b) => {
    const rankDiff = awardRank(a.award) - awardRank(b.award);
    return rankDiff !== 0 ? rankDiff : (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
  const winnerPhotos = assets.filter((a) => a.role === "winner_photo");
  const photoByPerson = new Map<string, any>();
  for (const p of winnerPhotos) {
    const key = norm(p.person_en ?? p.person_ko);
    if (key) photoByPerson.set(key, p);
  }
  const photos = assets.filter((a) => a.role === "photo" && a.resources?.id);
  const groupPhoto = photos.find((p) => norm(p.person_en) === "all") ?? photos.find((p) => (p?.resources?.original_filename ?? "").toLowerCase() === "all.jpg") ?? null;
  const otherPhotos = photos.filter((p) => p !== groupPhoto);
  const winnerNameSet = new Set(awardDocs.map((d) => norm(d.person_en ?? d.person_ko)));
  const submissions = assets.filter((a) => a.role === "slide").filter((a) => {
    const personKey = norm(a.person_en ?? a.person_ko);
    return !personKey || !winnerNameSet.has(personKey);
  }).filter((a) => a.resources?.id).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const hasPoster = Boolean(posterKo?.resources?.id || posterEn?.resources?.id);
  const hasWinners = awardDocs.length > 0;
  const hasPhotos = photos.length > 0;
  const hasSubmissions = submissions.length > 0;
  const tabs = [
    hasPoster ? { id: "poster", label: en ? "Poster" : "포스터" } : null,
    hasWinners ? { id: "winners", label: en ? "Winners" : "수상자" } : null,
    hasPhotos ? { id: "photo", label: en ? "Photos" : "사진" } : null,
    hasSubmissions ? { id: "materials", label: en ? "Entries" : "응모작" } : null,
  ].filter((item): item is { id: string; label: string } => Boolean(item));

  const sidebarSubmenu = (
    <div className={styles.submenu}><div className={styles.eventList}>
      {events.length === 0 ? <div className={styles.muted} style={{ padding: 10 }}>{en ? "No contests are registered." : "등록된 행사가 없습니다."}</div> : events.map((e) => {
        const active = e.id === selectedEventId;
        return <Link key={e.id} href={`${BASE}?event=${e.id}`} className={`${styles.eventItem} ${active ? styles.eventActive : ""}`}><div className={styles.eventDate}>{fmtPeriod(e.event_date, e.period_end)}</div><div className={styles.eventName}>{e.title_ko ?? (en ? "Contest" : "행사")}</div></Link>;
      })}
    </div></div>
  );

  return (
    <ResourcesFrame activeKey="shortform-contest" sidebarSubmenu={sidebarSubmenu}>
      <div className={styles.content}>
        <div className={styles.hero}>
          <div className={styles.eyebrow}>Short-form Contest Archive</div>
          <h1 className={styles.h1}>{selectedEvent?.title_ko ?? (en ? "Short-form Video Contest" : "숏폼영상공모전")}</h1>
          {selectedEvent ? <div className={styles.meta}>{fmtPeriod(selectedEvent.event_date, selectedEvent.period_end)}</div> : null}
          {tabs.length > 0 ? <SectionTabs items={tabs} /> : null}
        </div>

        {!selectedEventId ? <div className={styles.card}><div className={styles.muted}>{en ? "Select a contest from the sidebar." : "좌측에서 행사를 선택해 주세요."}</div></div> : (
          <>
            {hasPoster ? <section id="poster" className={styles.section}>
              <div className={styles.sectionTitle}>{en ? "Poster" : "포스터"}</div>
              <div className={styles.posterGrid}>
                {posterKo?.resources?.id ? <div className={styles.posterBlock}><div className={styles.posterLabel}>{en ? "Korean" : "국문"}</div><div className={styles.posterWrap}><div className={styles.posterInner}><PosterContent asset={posterKo} alt={en ? "Korean poster" : "국문 포스터"} openLabel={en ? "Open PDF poster" : "PDF 포스터 열기"} /></div></div></div> : null}
                {posterEn?.resources?.id ? <div className={styles.posterBlock}><div className={styles.posterLabel}>{en ? "English" : "영문"}</div><div className={styles.posterWrap}><div className={styles.posterInner}><PosterContent asset={posterEn} alt={en ? "English poster" : "영문 포스터"} openLabel={en ? "Open PDF poster" : "PDF 포스터 열기"} /></div></div></div> : null}
              </div>
            </section> : null}

            {hasWinners ? <section id="winners" className={styles.section}>
              <div className={styles.sectionTitle}>{en ? "Winners" : "수상자"}</div>
              <div className={styles.winnerGrid}>
                {awardDocs.map((w, idx) => {
                  const person = (w.person_en ?? w.person_ko ?? "").trim() || (en ? "Winner" : "수상자");
                  const personKey = norm(person);
                  const photoResource = (photoByPerson.get(personKey) ?? null)?.resources ?? null;
                  const doc = w.resources;
                  return <div key={`${doc?.id ?? idx}`} className={styles.winnerCard} style={{ gridTemplateColumns: "1fr", gap: 18, alignItems: "stretch" }}>
                    <div className={styles.winnerTop} style={{ justifyContent: "center", textAlign: "center" }}><span className={styles.badge}>{w.award ?? (en ? "Award" : "수상")}</span><span className={styles.winnerName}>{person}</span></div>
                    <div className={styles.winnerBody} style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 20, width: "100%" }}>
                      {photoResource?.id ? <div className={styles.winnerPhoto} style={{ width: 160, height: 160, flex: "0 0 160px" }}><a href={`/api/resources/go?id=${photoResource.id}`} target="_blank" rel="noreferrer" style={{ display: "block", width: "100%", height: "100%" }}><img src={`/api/resources/go?id=${photoResource.id}`} alt={photoResource.title ?? "winner_photo"} /></a></div> : null}
                      <div className={styles.winnerInfo} style={{ flex: "1 1 360px", width: "100%", maxWidth: 640, minWidth: 0, textAlign: "center" }}>
                        {doc?.source_path && youtubeVideoId(doc.source_path) ? <div style={{ display: "grid", gap: 12, width: "100%" }}>{w.item_title_ko || w.item_title_en ? <div style={{ fontWeight: 700, color: "#263244", wordBreak: "break-word" }}>{w.item_title_ko ?? w.item_title_en}</div> : null}<YouTubePreview url={doc.source_path} title={w.item_title_ko ?? w.item_title_en ?? `${person} ${en ? "winning entry" : "수상 작품"}`} /><a className={styles.winnerLink} href={doc.source_path} target="_blank" rel="noreferrer" style={{ justifySelf: "center" }}>{en ? "View on YouTube" : "유튜브에서 보기"}</a></div> : doc?.id ? <a className={styles.winnerLink} href={`/api/resources/go?id=${doc.id}`} target="_blank" rel="noreferrer">{en ? "Open entry" : "응모작 열기"}</a> : null}
                      </div>
                    </div>
                  </div>;
                })}
              </div>
            </section> : null}

            {hasPhotos ? <section id="photo" className={styles.section}>
              <div className={styles.sectionTitle}>{en ? "Photos" : "사진"}</div>
              {groupPhoto?.resources?.id ? <div className={styles.photoLarge}><div className={styles.photoLabel}>{en ? "Group Photo" : "단체 사진"}</div><a href={`/api/resources/go?id=${groupPhoto.resources.id}`} target="_blank" rel="noreferrer"><img src={`/api/resources/go?id=${groupPhoto.resources.id}`} alt={groupPhoto.resources.title ?? "group_photo"} /></a></div> : null}
              {otherPhotos.length > 0 ? <div className={styles.photoGrid}>{otherPhotos.map((p, i) => { const rid = p.resources?.id; if (!rid) return null; return <a key={`${rid}-${i}`} className={styles.photoThumb} href={`/api/resources/go?id=${rid}`} target="_blank" rel="noreferrer"><img src={`/api/resources/go?id=${rid}`} alt={p.resources?.title ?? "photo"} /></a>; })}</div> : null}
            </section> : null}

            {hasSubmissions ? <section id="materials" className={styles.section}>
              <div className={styles.sectionTitle}>{en ? "Entries" : "응모작"}</div>
              <div style={{ display: "grid", gap: 12 }}>
                {submissions.map((asset, index) => {
                  const person = (asset.person_en ?? asset.person_ko ?? "").trim();
                  const label = (asset.resources?.title ?? asset.item_title_ko ?? asset.item_title_en ?? asset.resources?.original_filename ?? (en ? "Entry" : "응모작")).trim() || (en ? "Entry" : "응모작");
                  const resourceId = asset.resources?.id;
                  const sourcePath = asset.resources?.source_path ?? "";
                  const videoId = youtubeVideoId(sourcePath);
                  if (!resourceId) return null;
                  return <div key={`${resourceId}-${index}`} className={styles.card} style={{ display: "grid", gap: 12 }}><div style={{ fontWeight: 700, color: "#263244" }}>{label}</div>{person ? <div className={styles.muted}>{person}</div> : null}{videoId ? <><YouTubePreview url={sourcePath} title={label} /><a className={styles.materialLink} href={sourcePath} target="_blank" rel="noreferrer">{en ? "View on YouTube" : "유튜브에서 보기"}</a></> : <a className={styles.materialLink} href={`/api/resources/go?id=${resourceId}`} target="_blank" rel="noreferrer">{en ? "Open entry" : "응모작 열기"}</a>}</div>;
                })}
              </div>
            </section> : null}

            {!hasPoster && !hasWinners && !hasPhotos && !hasSubmissions ? <div className={styles.card}><div className={styles.muted}>{en ? "No public materials are registered for this contest." : "이 행사에 등록된 공개 자료가 없습니다."}</div></div> : null}
          </>
        )}
      </div>
    </ResourcesFrame>
  );
}

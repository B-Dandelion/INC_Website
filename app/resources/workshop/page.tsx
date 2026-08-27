// app/resources/workshop/page.tsx
import Link from "next/link";
import ResourcesFrame from "@/components/resources/ResourcesFrame";
import SectionTabs from "@/components/resources/SectionTabs";
import styles from "./workshop.module.css";
import { fetchEvents, fetchEventAssets } from "@/lib/eventsDb";
import { getLocale } from "@/lib/i18n";

const BASE = "/resources/workshop";

function fmtPeriod(start?: string | null, end?: string | null) {
  if (!start) return "";
  return end ? `${start} ~ ${end}` : start;
}

function isImageLike(mime?: string | null, filename?: string | null) {
  if (mime?.startsWith("image/")) return true;
  return /\.(jpg|jpeg|png|webp|gif)$/i.test((filename ?? "").toLowerCase());
}

export default async function WorkshopPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const locale = await getLocale();
  const en = locale === "en";
  const sp = await searchParams;
  const events = await fetchEvents({ category: "workshop" });
  const selectedEventId = (sp.event && events.some((e) => e.id === sp.event) ? sp.event : events[0]?.id) ?? null;
  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;
  const assets = selectedEventId ? await fetchEventAssets(selectedEventId) : [];

  const posterKo = assets.find((a) => a.role === "poster_ko") ?? null;
  const posterEn = assets.find((a) => a.role === "poster_en") ?? null;
  const timetable = assets.find((a) => a.role === "timetable") ?? null;
  const photos = assets.filter((a) => a.role === "photo" && a.resources?.id);
  const materials = assets.filter((a) => a.role === "slide" && a.resources?.id).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const hasPoster = Boolean(posterKo?.resources?.id || posterEn?.resources?.id);

  const tabs = [
    hasPoster ? { id: "poster", label: en ? "Poster" : "포스터" } : null,
    timetable?.resources?.id ? { id: "timetable", label: en ? "Schedule" : "시간표" } : null,
    photos.length > 0 ? { id: "photo", label: en ? "Photos" : "사진" } : null,
    materials.length > 0 ? { id: "materials", label: en ? "Materials" : "자료" } : null,
  ].filter(Boolean) as { id: string; label: string }[];

  const sidebarSubmenu = (
    <div className={styles.submenu}>
      <div className={styles.eventList}>
        {events.length === 0 ? (
          <div className={styles.muted} style={{ padding: 10 }}>{en ? "No workshops are registered." : "등록된 행사가 없습니다."}</div>
        ) : events.map((e) => {
          const active = e.id === selectedEventId;
          return (
            <Link key={e.id} href={`${BASE}?event=${e.id}`} className={`${styles.eventItem} ${active ? styles.eventActive : ""}`}>
              <div className={styles.eventDate}>{fmtPeriod(e.event_date, e.period_end)}</div>
              <div className={styles.eventName}>{e.title_ko ?? (en ? "Workshop" : "행사")}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );

  const renderAssetAsMedia = (asset: any) => {
    const r = asset?.resources;
    if (!r?.id) return null;
    const href = `/api/resources/go?id=${r.id}`;
    const title = r.title ?? r.original_filename ?? "file";
    return isImageLike(r.mime, r.original_filename) ? (
      <a className={styles.mediaWrap} href={href} target="_blank" rel="noreferrer" title={title}>
        <img className={styles.mediaImg} src={href} alt={title} />
      </a>
    ) : (
      <div className={styles.card}>
        <a className={styles.linkBtn} href={href} target="_blank" rel="noreferrer">{title} {en ? "Open" : "열기"}</a>
      </div>
    );
  };

  return (
    <ResourcesFrame activeKey="workshop" sidebarSubmenu={sidebarSubmenu}>
      <div className={styles.content}>
        <div className={styles.hero}>
          <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#2B6CA3]">Workshop</div>
          <h1 className={styles.h1}>{selectedEvent?.title_ko ?? (en ? "Workshop" : "워크샵")}</h1>
          <div className={styles.meta}>{fmtPeriod(selectedEvent?.event_date, selectedEvent?.period_end)}</div>
          {tabs.length > 0 ? <SectionTabs items={tabs} /> : null}
        </div>

        {!selectedEventId ? (
          <div className={styles.card}><div className={styles.muted}>{en ? "Select a workshop from the sidebar." : "좌측에서 행사를 선택해 주세요."}</div></div>
        ) : tabs.length === 0 ? (
          <div className={styles.card}><div className={styles.muted}>{en ? "No detailed materials are registered for this workshop." : "이 행사에 등록된 세부 자료가 없습니다."}</div></div>
        ) : (
          <>
            {hasPoster ? (
              <section id="poster" className={styles.section}>
                <div className={styles.sectionTitle}>{en ? "Poster" : "포스터"}</div>
                <div className={styles.posterGrid}>
                  {posterKo?.resources?.id ? <div className={styles.posterBlock}><div className={styles.posterLabel}>{en ? "Korean" : "국문"}</div>{renderAssetAsMedia(posterKo)}</div> : null}
                  {posterEn?.resources?.id ? <div className={styles.posterBlock}><div className={styles.posterLabel}>{en ? "English" : "영문"}</div>{renderAssetAsMedia(posterEn)}</div> : null}
                </div>
              </section>
            ) : null}

            {timetable?.resources?.id ? (
              <section id="timetable" className={styles.section}>
                <div className={styles.sectionTitle}>{en ? "Schedule" : "시간표"}</div>
                {renderAssetAsMedia(timetable)}
              </section>
            ) : null}

            {photos.length > 0 ? (
              <section id="photo" className={styles.section}>
                <div className={styles.sectionTitle}>{en ? "Photos" : "사진"}</div>
                <div className={styles.photoGrid}>
                  {photos.map((p, i) => {
                    const r = p.resources!;
                    const href = `/api/resources/go?id=${r.id}`;
                    const title = r.title ?? r.original_filename ?? "photo";
                    return <a key={`${r.id ?? i}`} className={styles.photoThumb} href={href} target="_blank" rel="noreferrer" title={title}><img src={href} alt={title} /></a>;
                  })}
                </div>
              </section>
            ) : null}

            {materials.length > 0 ? (
              <section id="materials" className={styles.section}>
                <div className={styles.sectionTitle}>{en ? "Materials" : "자료"}</div>
                <div className={styles.board}>
                  <div className={styles.boardHead}>
                    <div>{en ? "Workshop Materials" : "응모/발제 자료"}</div>
                    <div className={styles.boardCount}>{materials.length}{en ? " items" : "건"}</div>
                  </div>
                  <ul className={styles.boardList}>
                    {materials.map((a, i) => {
                      const r = a.resources!;
                      const href = `/api/resources/go?id=${r.id}`;
                      const title = r.title ?? r.original_filename ?? `${en ? "Material" : "자료"} ${i + 1}`;
                      return <li key={`${r.id ?? i}`} className={styles.boardRow}><a className={styles.boardLink} href={href} target="_blank" rel="noreferrer">{title}</a><span className={styles.boardMeta}>PDF</span></li>;
                    })}
                  </ul>
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </ResourcesFrame>
  );
}

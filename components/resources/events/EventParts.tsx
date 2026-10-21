// components/resources/events/EventParts.tsx
// Building blocks for the event boards (세미나, 워크샵, 과제 보고회, 에세이
// 경진대회, 숏폼영상 공모전): one layout, one look for posters, photos and files.
import Link from "next/link";
import { ArrowUpRight, Calendar, FileText, PlayCircle } from "lucide-react";
import ResourcesFrame, { type ResourceNavKey } from "../ResourcesFrame";
import SectionTabs from "../SectionTabs";
import YouTubeFacade from "./YouTubeFacade";
import type { EventAssetRow, EventRow } from "@/lib/eventsDb";
import { fileHref, fmtPeriod, isImageAsset, isPdfAsset, meaningfulCaption, youtubeVideoId } from "./shared";

type Tab = { id: string; label: string };

/* ---------- Event list shown under the active category ---------- */

export function EventList({
  events,
  selectedId,
  href,
  en,
  emptyText,
  switcher,
}: {
  events: EventRow[];
  selectedId: string | null;
  href: (id: string) => string;
  en: boolean;
  emptyText: string;
  switcher?: { label: string; href: string; active: boolean }[];
}) {
  return (
    <div className="grid gap-2 py-2">
      {switcher ? (
        <div className="grid grid-cols-2 gap-1 rounded-md bg-slate-100 p-1" role="group" aria-label={en ? "Seminar type" : "세미나 구분"}>
          {switcher.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              aria-current={s.active ? "page" : undefined}
              className={`rounded-[4px] py-1.5 text-center text-[13px] font-semibold transition ${
                s.active ? "bg-white text-[#174A7E] shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:text-[#174A7E]"
              }`}
            >
              {s.label}
            </Link>
          ))}
        </div>
      ) : null}
      {events.length === 0 ? (
        <p className="px-2 py-3 text-[13px] text-slate-600">{emptyText}</p>
      ) : (
        <ul className="grid max-h-[420px] gap-0.5 overflow-y-auto">
          {events.map((e) => {
            const active = e.id === selectedId;
            return (
              <li key={e.id}>
                <Link
                  href={href(e.id)}
                  aria-current={active ? "true" : undefined}
                  className={`block rounded-md border-l-2 px-2.5 py-2 transition ${
                    active ? "border-[#174A7E] bg-[#EEF4FA]" : "border-transparent hover:bg-slate-50"
                  }`}
                >
                  <span className="block text-[11px] font-semibold tabular-nums text-slate-600">{fmtPeriod(e.event_date, e.period_end)}</span>
                  <span className={`mt-0.5 block text-[13px] leading-5 [overflow-wrap:anywhere] ${active ? "font-bold text-[#174A7E]" : "font-medium text-slate-800"}`}>
                    {e.title_ko}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ---------- Page shell ---------- */

export function EventPage({
  activeKey,
  board,
  event,
  facts,
  tabs,
  submenu,
  en,
  children,
}: {
  activeKey: ResourceNavKey;
  board: string;
  event: EventRow | null;
  facts: string[];
  tabs: Tab[];
  submenu: React.ReactNode;
  en: boolean;
  children: React.ReactNode;
}) {
  const period = fmtPeriod(event?.event_date, event?.period_end);
  return (
    <ResourcesFrame activeKey={activeKey} sidebarSubmenu={submenu}>
      <div className="mx-auto max-w-[1040px] pb-12">
        <header className="mb-6">
          <nav aria-label={en ? "Breadcrumb" : "위치"} className="text-[13px] font-semibold text-slate-600">
            <Link href="/resources" className="hover:text-[#174A7E]">
              {en ? "Resources" : "자료실"}
            </Link>
            <span className="mx-1.5" aria-hidden="true">/</span>
            <span>{en ? "Events" : "행사 자료"}</span>
            <span className="mx-1.5" aria-hidden="true">/</span>
            <span>{board}</span>
          </nav>
          <h1 className="mt-3 text-[28px] font-bold leading-tight tracking-[-0.03em] text-slate-950 [overflow-wrap:anywhere] md:text-[30px]">
            {event?.title_ko ?? board}
          </h1>
          {period || facts.length ? (
            <ul className="mt-4 flex flex-wrap gap-2 text-[13px] font-semibold text-slate-700">
              {period ? (
                <li className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 ring-1 ring-slate-200">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                  <span className="tabular-nums">{period}</span>
                </li>
              ) : null}
              {facts.map((f) => (
                <li key={f} className="rounded-md bg-white px-2.5 py-1 ring-1 ring-slate-200">
                  {f}
                </li>
              ))}
            </ul>
          ) : null}
        </header>
        {tabs.length > 1 ? (
          <div className="sticky top-[72px] z-10 -mx-1 mb-6 border-b border-slate-200 bg-[#F6F7F9]/95 px-1 backdrop-blur">
            <SectionTabs items={tabs} label={en ? "Sections" : "섹션"} />
          </div>
        ) : null}
        {children}
      </div>
    </ResourcesFrame>
  );
}

export function EmptyEvent({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm leading-6 text-slate-600">{children}</div>;
}

export function EventSection({ id, title, count, children }: { id: string; title: string; count?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mb-8 scroll-mt-32">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id={`${id}-title`} className="text-[18px] font-bold tracking-[-0.01em] text-slate-950">
          {title}
        </h2>
        {count ? <span className="text-[13px] font-semibold text-slate-600">{count}</span> : null}
      </div>
      {children}
    </section>
  );
}

/* ---------- Posters / timetable ---------- */

function FileTile({ asset, label, en }: { asset: EventAssetRow; label: string; en: boolean }) {
  const r = asset.resources!;
  const name = (r.title ?? "").trim() || r.original_filename || label;
  return (
    <a
      href={fileHref(r.id)}
      target="_blank"
      rel="noopener"
      className="group flex min-h-[120px] min-w-0 items-center gap-4 rounded-lg border border-slate-200 bg-white p-5 transition hover:border-[#9BB9D6]"
    >
      <FileText className="h-8 w-8 shrink-0 text-[#174A7E]" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold leading-6 text-slate-900 [overflow-wrap:anywhere] group-hover:text-[#174A7E]">{name}</span>
        <span className="mt-1 inline-flex items-center gap-1 text-[13px] font-semibold text-[#2B6CA3]">
          {isPdfAsset(asset) ? (en ? "Open PDF" : "PDF 열기") : en ? "Open file" : "파일 열기"}
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </span>
    </a>
  );
}

/** An image is shown in full (click opens the original); anything else becomes a file tile. */
export function MediaAsset({ asset, label, en, tall }: { asset: EventAssetRow; label: string; en: boolean; tall?: boolean }) {
  const r = asset.resources;
  if (!r?.id) return null;
  if (!isImageAsset(asset)) return <FileTile asset={asset} label={label} en={en} />;
  return (
    <a
      href={fileHref(r.id)}
      target="_blank"
      rel="noopener"
      className="block overflow-hidden rounded-lg border border-slate-200 bg-white p-2 transition hover:border-[#9BB9D6]"
    >
      <img
        src={fileHref(r.id)}
        alt={label}
        decoding="async"
        className={`mx-auto w-full rounded-[4px] object-contain ${tall ? "max-h-[760px]" : ""}`}
      />
    </a>
  );
}

export function PosterPair({ ko, eng, board, en }: { ko: EventAssetRow | null; eng: EventAssetRow | null; board: string; en: boolean }) {
  const items = [
    ko?.resources?.id ? { asset: ko, lang: en ? "Korean" : "국문" } : null,
    eng?.resources?.id ? { asset: eng, lang: en ? "English" : "영문" } : null,
  ].filter((x): x is { asset: EventAssetRow; lang: string } => Boolean(x));
  const two = items.length > 1;
  return (
    <div className={`grid gap-4 ${two ? "md:grid-cols-2" : "max-w-[620px]"}`}>
      {items.map(({ asset, lang }) => (
        <figure key={asset.id} className="min-w-0">
          {two ? <figcaption className="mb-2 text-[13px] font-semibold text-slate-600">{lang}</figcaption> : null}
          <MediaAsset asset={asset} label={`${board} ${two ? `${lang} ` : ""}${en ? "poster" : "포스터"}`} en={en} tall />
        </figure>
      ))}
    </div>
  );
}

/* ---------- Photos ---------- */

export function PhotoGallery({
  photos,
  group,
  board,
  en,
}: {
  photos: EventAssetRow[];
  group?: EventAssetRow | null;
  board: string;
  en: boolean;
}) {
  return (
    <div className="grid gap-3">
      {group?.resources?.id ? (
        <figure className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <a href={fileHref(group.resources.id)} target="_blank" rel="noopener" className="block bg-slate-100">
            <img src={fileHref(group.resources.id)} alt={en ? `${board} group photo` : `${board} 단체 사진`} loading="lazy" decoding="async" className="w-full object-cover" />
          </a>
          <figcaption className="px-4 py-2.5 text-[13px] font-semibold text-slate-600">{en ? "Group photo" : "단체 사진"}</figcaption>
        </figure>
      ) : null}
      {photos.length ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4" aria-label={en ? "Photos" : "사진"}>
          {photos.map((p, i) => {
            const r = p.resources;
            if (!r?.id) return null;
            const caption = meaningfulCaption(r.title) ?? meaningfulCaption(r.original_filename);
            const alt = caption ? "" : en ? `${board} photo ${i + 1}` : `${board} 사진 ${i + 1}`;
            return (
              <li key={p.id}>
                <a href={fileHref(r.id)} target="_blank" rel="noopener" className="group block overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                  <img
                    src={fileHref(r.id)}
                    alt={alt}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                  />
                  {caption ? <span className="block truncate bg-white px-2.5 py-1.5 text-[12px] text-slate-600">{caption}</span> : null}
                </a>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

/* ---------- Files ---------- */

function kindLabel(asset: EventAssetRow) {
  const r = asset.resources;
  const ext = (r?.original_filename ?? "").split(".").pop()?.toLowerCase() ?? "";
  if (isPdfAsset(asset)) return { label: "PDF", tone: "bg-[#FDF2F2] text-[#9B1C1C] ring-[#F5D0D0]" };
  if (["ppt", "pptx"].includes(ext)) return { label: "PPT", tone: "bg-[#FDF5EC] text-[#9A4A0B] ring-[#F2DCC2]" };
  if (["hwp", "hwpx", "doc", "docx"].includes(ext)) return { label: ext === "hwpx" ? "HWP" : ext.toUpperCase().slice(0, 4), tone: "bg-[#EEF4FA] text-[#174A7E] ring-[#CFE0F0]" };
  if (isImageAsset(asset)) return { label: "IMG", tone: "bg-[#EEF6F1] text-[#1F6B43] ring-[#CFE6D8]" };
  if (youtubeVideoId(r?.source_path)) return { label: "VIDEO", tone: "bg-[#F3F1FA] text-[#4B3A8C] ring-[#DDD7F0]" };
  return { label: (ext || "FILE").toUpperCase().slice(0, 5), tone: "bg-slate-100 text-slate-700 ring-slate-200" };
}

export type MaterialItem = { asset: EventAssetRow; title: string; sub?: string | null };

export function MaterialGrid({ items, en }: { items: MaterialItem[]; en: boolean }) {
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {items.map(({ asset, title, sub }) => {
        const r = asset.resources!;
        const t = kindLabel(asset);
        return (
          <li key={asset.id} className="min-w-0">
            <a
              href={fileHref(r.id)}
              target="_blank"
              rel="noopener"
              className="group flex h-full min-w-0 items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 transition hover:border-[#9BB9D6] hover:bg-[#FBFDFF]"
            >
              <span className={`inline-flex h-12 w-10 shrink-0 items-end justify-center rounded-[4px] pb-1.5 text-[10px] font-bold tracking-wide ring-1 ring-inset ${t.tone}`} aria-hidden="true">
                {t.label}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 block text-[15px] font-semibold leading-6 text-slate-900 [overflow-wrap:anywhere] group-hover:text-[#174A7E]">{title}</span>
                {sub ? <span className="mt-0.5 block truncate text-[13px] text-slate-600">{sub}</span> : null}
              </span>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-[#174A7E]" aria-hidden="true" />
              <span className="sr-only">{en ? "(opens in a new tab)" : "(새 탭에서 열림)"}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------- Video ---------- */

export function YouTubePreview({ url, title, en }: { url: string; title: string; en: boolean }) {
  const id = youtubeVideoId(url);
  if (!id) return null;
  return <YouTubeFacade id={id} title={title} playLabel={en ? "Play video" : "영상 재생"} />;
}

export function AwardBadge({ award, en }: { award: string | null; en: boolean }) {
  const label = (award ?? "").trim() || (en ? "Award" : "수상");
  const top = label === "대상" || label === "금상";
  return (
    <span className={`inline-flex rounded px-2 py-0.5 text-[12px] font-bold ${top ? "bg-[#174A7E] text-white" : "bg-[#EEF4FA] text-[#174A7E] ring-1 ring-inset ring-[#CFE0F0]"}`}>
      {label}
    </span>
  );
}

export function VideoLink({ href, en }: { href: string; en: boolean }) {
  return (
    <a href={href} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#2B6CA3] hover:text-[#174A7E]">
      <PlayCircle className="h-4 w-4" aria-hidden="true" />
      {en ? "Watch on YouTube" : "유튜브에서 보기"}
    </a>
  );
}

/* ---------- Contest winners and video entries ---------- */

export function WinnerCard({
  award,
  person,
  photo,
  entryTitle,
  doc,
  videoUrl,
  en,
}: {
  award: string | null;
  person: string;
  photo: EventAssetRow | null;
  entryTitle?: string | null;
  doc: EventAssetRow | null;
  videoUrl?: string | null;
  en: boolean;
}) {
  const photoId = photo?.resources?.id;
  const docId = doc?.resources?.id;
  return (
    <article className="flex h-full min-w-0 flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex min-w-0 items-center gap-4">
        {photoId ? (
          <a href={fileHref(photoId)} target="_blank" rel="noopener" className="block h-[88px] w-[88px] shrink-0 overflow-hidden rounded-md bg-slate-100">
            <img src={fileHref(photoId)} alt={en ? `Photo of ${person}` : `${person} 사진`} loading="lazy" decoding="async" className="h-full w-full object-cover" />
          </a>
        ) : null}
        <div className="min-w-0 flex-1">
          <AwardBadge award={award} en={en} />
          <h3 className="mt-1.5 text-[17px] font-bold leading-6 text-slate-950 [overflow-wrap:anywhere]">{person}</h3>
          {entryTitle ? <p className="mt-0.5 line-clamp-2 text-[13px] leading-5 text-slate-600 [overflow-wrap:anywhere]">{entryTitle}</p> : null}
          {!videoUrl && docId ? (
            <a href={fileHref(docId)} target="_blank" rel="noopener" className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-[#2B6CA3] hover:text-[#174A7E]">
              {isPdfAsset(doc) ? (en ? "Read entry (PDF)" : "응모작 보기 (PDF)") : en ? "Open entry" : "응모작 열기"}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ) : null}
        </div>
      </div>
      {videoUrl ? (
        <div className="grid gap-2">
          <YouTubePreview url={videoUrl} title={entryTitle || (en ? `${person} winning entry` : `${person} 수상 작품`)} en={en} />
          <VideoLink href={videoUrl} en={en} />
        </div>
      ) : null}
    </article>
  );
}

export function VideoEntryCard({ title, person, url, fileId, en }: { title: string; person?: string | null; url?: string | null; fileId: number; en: boolean }) {
  const isVideo = Boolean(youtubeVideoId(url));
  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold leading-6 text-slate-900 [overflow-wrap:anywhere]">{title}</h3>
        {person ? <p className="text-[13px] text-slate-600">{person}</p> : null}
      </div>
      {isVideo && url ? (
        <>
          <YouTubePreview url={url} title={title} en={en} />
          <VideoLink href={url} en={en} />
        </>
      ) : (
        <a href={fileHref(fileId)} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#2B6CA3] hover:text-[#174A7E]">
          {en ? "Open entry" : "응모작 열기"}
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      )}
    </article>
  );
}

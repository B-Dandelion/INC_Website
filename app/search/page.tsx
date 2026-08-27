import Link from "next/link";
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChevronRight,
  FolderOpen,
  MapPin,
  Search,
} from "lucide-react";
import { fetchResources } from "@/lib/resourcesDb";
import { fetchNotices } from "@/lib/noticesDb";
import { fetchPromotionEvents } from "@/lib/promotionalEventsDb";
import { RESOURCE_BOARDS } from "@/lib/resourceBoards";
import { getLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

function normalize(value?: string | null) {
  return (value ?? "").toLocaleLowerCase("ko-KR").replace(/\s+/g, " ").trim();
}

function includesQuery(query: string, ...values: Array<string | null | undefined>) {
  const needle = normalize(query);
  if (!needle) return false;
  return values.some((value) => normalize(value).includes(needle));
}

function compact(value?: string | null, max = 150) {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

function boardLabel(slug: string | null | undefined, fallback: string | null | undefined, en: boolean) {
  if (slug) {
    const match = RESOURCE_BOARDS.find((board) => board.slug === slug);
    if (match) return en ? match.labelEn : match.label;
  }
  return fallback || slug || (en ? "Resources" : "자료실");
}

function eventPeriod(start: string | null | undefined, end: string | null | undefined, en: boolean) {
  if (!start) return en ? "Schedule TBD" : "일정 미정";
  return end && end !== start ? `${start} ~ ${end}` : start;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const locale = await getLocale();
  const en = locale === "en";
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  let resourceRows: Awaited<ReturnType<typeof fetchResources>> = [];
  let noticeRows: Awaited<ReturnType<typeof fetchNotices>> = [];
  let eventRows: Awaited<ReturnType<typeof fetchPromotionEvents>> = [];

  if (q) {
    [resourceRows, noticeRows, eventRows] = await Promise.all([
      fetchResources({ q, page: 1, pageSize: 100 }),
      fetchNotices({ page: 1, pageSize: 100 }),
      fetchPromotionEvents(),
    ]);
  }

  const notices = q ? noticeRows.filter((notice) => includesQuery(q, notice.title, notice.content)) : [];
  const events = q
    ? eventRows.filter((event) =>
        includesQuery(
          q,
          event.title_ko,
          event.summary_ko,
          event.content_ko,
          event.topic_ko,
          event.location_ko,
          event.audience_ko,
        ),
      )
    : [];

  const total = resourceRows.length + notices.length + events.length;

  return (
    <main className="min-h-screen bg-[#F6F7F9]">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-11 md:px-6 md:py-14">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#2B6CA3]">Search</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-slate-950 md:text-4xl">{en ? "Site Search" : "통합 검색"}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500 md:text-[15px]">
            {en ? "Search resources, notices, and events in one place." : "자료실, 공지사항, 행사·이벤트를 한 번에 검색합니다."}
          </p>

          <form action="/search" method="get" role="search" className="mt-7 flex max-w-2xl gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                name="q"
                type="search"
                defaultValue={q}
                aria-label={en ? "Search query" : "검색어"}
                placeholder={en ? "Enter a search term" : "검색어를 입력하세요"}
                className="h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-[#2B6CA3] focus:ring-2 focus:ring-[#2B6CA3]/10"
              />
            </div>
            <button type="submit" className="h-11 shrink-0 rounded-md bg-[#174A7E] px-5 text-sm font-bold text-white transition hover:bg-[#103A66]">
              {en ? "Search" : "검색"}
            </button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10 md:px-6 md:py-14">
        {!q ? (
          <div className="border border-slate-200 bg-white px-6 py-14 text-center">
            <Search className="mx-auto h-6 w-6 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">{en ? "Enter a search term." : "검색어를 입력해 주세요."}</p>
            <p className="mt-1 text-sm text-slate-400">{en ? "Search resource titles, notice content, event names, locations, and more." : "자료 제목, 공지 내용, 행사명과 장소 등을 찾을 수 있습니다."}</p>
          </div>
        ) : total === 0 ? (
          <div className="border border-slate-200 bg-white px-6 py-14 text-center">
            <p className="text-base font-semibold text-slate-800">{en ? `No results for “${q}”.` : `“${q}” 검색 결과가 없습니다.`}</p>
            <p className="mt-2 text-sm text-slate-400">{en ? "Try a shorter or different search term." : "검색어를 줄이거나 다른 표현으로 다시 검색해 보세요."}</p>
          </div>
        ) : (
          <div className="space-y-10">
            <div className="flex items-baseline justify-between border-b border-slate-300 pb-3">
              <p className="text-sm text-slate-500"><span className="font-semibold text-slate-900">“{q}”</span> {en ? "results" : "검색 결과"}</p>
              <span className="text-xs font-semibold tabular-nums text-slate-400">{en ? `${total} total` : `총 ${total}건`}</span>
            </div>

            {resourceRows.length > 0 ? (
              <section aria-labelledby="search-resources">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2"><FolderOpen className="h-4 w-4 text-[#174A7E]" /><h2 id="search-resources" className="text-lg font-semibold text-slate-900">{en ? "Resources" : "자료실"}</h2></div>
                  <span className="text-xs font-semibold tabular-nums text-slate-400">{resourceRows.length}{en ? " items" : "건"}</span>
                </div>

                <div className="border border-slate-200 bg-white">
                  {resourceRows.map((resource, index) => {
                    const category = boardLabel(resource.boards?.slug, resource.boards?.title, en);
                    const title = (resource.title || resource.original_filename || (en ? "Resource" : "자료")).trim();
                    const description = compact(resource.note || resource.original_filename);
                    const date = resource.posted_at || resource.published_at || "";
                    return (
                      <a key={resource.id} href={`/api/resources/go?id=${resource.id}`} target="_blank" rel="noreferrer" className={`group flex items-start justify-between gap-5 px-5 py-4 transition hover:bg-slate-50 ${index !== resourceRows.length - 1 ? "border-b border-slate-100" : ""}`}>
                        <div className="min-w-0">
                          <div className="mb-1.5 flex items-center gap-2 text-xs font-bold text-[#2B6CA3]"><span>{category}</span><span className="font-normal text-slate-300">/</span><span className="font-medium text-slate-400">{en ? "Resources" : "자료실"}</span></div>
                          <div className="text-[15px] font-semibold leading-6 text-slate-900 transition group-hover:text-[#174A7E]">{title}</div>
                          {description ? <p className="mt-1 line-clamp-1 text-sm text-slate-500">{description}</p> : null}
                          {date ? <div className="mt-2 text-xs tabular-nums text-slate-400">{date}</div> : null}
                        </div>
                        <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-[#174A7E]" />
                      </a>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {notices.length > 0 ? (
              <section aria-labelledby="search-notices">
                <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><Bell className="h-4 w-4 text-[#174A7E]" /><h2 id="search-notices" className="text-lg font-semibold text-slate-900">{en ? "Notices" : "공지사항"}</h2></div><span className="text-xs font-semibold tabular-nums text-slate-400">{notices.length}{en ? " items" : "건"}</span></div>
                <div className="border border-slate-200 bg-white">
                  {notices.map((notice, index) => (
                    <Link key={notice.id} href={`/notice/${notice.id}`} className={`group flex items-start justify-between gap-5 px-5 py-4 transition hover:bg-slate-50 ${index !== notices.length - 1 ? "border-b border-slate-100" : ""}`}>
                      <div className="min-w-0">
                        <div className="mb-1.5 flex items-center gap-2 text-xs font-bold text-[#2B6CA3]"><span>{en ? "Notice" : "공지사항"}</span>{notice.pinned ? <span className="border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-500">{en ? "Pinned" : "고정"}</span> : null}</div>
                        <div className="text-[15px] font-semibold leading-6 text-slate-900 transition group-hover:text-[#174A7E]">{notice.title}</div>
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{compact(notice.content, 170)}</p>
                        <div className="mt-2 text-xs tabular-nums text-slate-400">{notice.posted_at}</div>
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-[#174A7E]" />
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {events.length > 0 ? (
              <section aria-labelledby="search-events">
                <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#174A7E]" /><h2 id="search-events" className="text-lg font-semibold text-slate-900">{en ? "Events" : "행사 · 이벤트"}</h2></div><span className="text-xs font-semibold tabular-nums text-slate-400">{events.length}{en ? " items" : "건"}</span></div>
                <div className="border border-slate-200 bg-white">
                  {events.map((event, index) => (
                    <Link key={event.id} href={`/events/${event.id}`} className={`group flex items-start justify-between gap-5 px-5 py-4 transition hover:bg-slate-50 ${index !== events.length - 1 ? "border-b border-slate-100" : ""}`}>
                      <div className="min-w-0">
                        <div className="mb-1.5 text-xs font-bold text-[#2B6CA3]">{en ? "Event" : "행사 · 이벤트"}</div>
                        <div className="text-[15px] font-semibold leading-6 text-slate-900 transition group-hover:text-[#174A7E]">{event.title_ko}</div>
                        {event.summary_ko || event.content_ko ? <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{compact(event.summary_ko || event.content_ko, 170)}</p> : null}
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400"><span className="inline-flex items-center gap-1.5 tabular-nums"><CalendarDays className="h-3.5 w-3.5" />{eventPeriod(event.event_date, event.period_end, en)}</span>{event.location_ko ? <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{event.location_ko}</span> : null}</div>
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-[#174A7E]" />
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}

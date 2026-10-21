import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Search } from "lucide-react";
import LatestTabs from "@/components/home/LatestTabs";
import PublicationHighlights from "@/components/home/PublicationHighlights";
import { RESOURCE_BOARDS } from "@/lib/resourceBoards";
import { fetchPublicResources } from "@/lib/resourcesDb";
import { fetchHomepagePromotion } from "@/lib/promotionalEventsDb";
import { fetchLatestIssue, isPublicationSlug, issuePath } from "@/lib/publications";
import { getLocale } from "@/lib/i18n";
import { fetchNotices } from "@/lib/noticesDb";

function todayInKorea() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default async function HomePage() {
  const locale = await getLocale();
  const en = locale === "en";

  // The home sections are independent, so fetch them in parallel.
  const [resourceRows, noticeRows, promotion, latestAtm, latestHeartbeat] = await Promise.all([
    fetchPublicResources(5),
    fetchNotices({ page: 1, pageSize: 5 }),
    fetchHomepagePromotion(todayInKorea()),
    fetchLatestIssue("atm"),
    fetchLatestIssue("heartbeat-of-atoms"),
  ]);

  const latestResources = resourceRows.map((r) => {
    const slug = r.boards?.slug ?? "";
    return {
      id: String(r.id),
      title: r.title ?? (en ? "Untitled" : "제목 없음"),
      date: (r.published_at ?? r.created_at ?? "").toString().slice(0, 10),
      // Publications open their readable page; other files open as before.
      href: isPublicationSlug(slug) ? issuePath(slug, r.id) : `/api/resources/go?id=${r.id}`,
    };
  });

  const latestNotices = noticeRows.map((n) => ({
    id: String(n.id),
    title: n.title,
    date: (n.posted_at ?? "").toString().slice(0, 10),
    href: `/notice/${n.id}`,
  }));

  const featuredEvent = promotion
    ? {
        id: promotion.id,
        title: promotion.title_ko,
        summary: promotion.summary_ko ?? (en ? "View event details and participation information." : "행사 상세 내용과 참여 정보를 확인해 주세요."),
        startDate: promotion.event_date ?? "",
        endDate: promotion.period_end ?? "",
      }
    : null;

  return (
    <main className="bg-[#F6F7F9]">
      <section className="relative flex min-h-[380px] items-center overflow-hidden border-b border-slate-200 md:min-h-[440px]">
        <div className="absolute inset-0">
          <Image
            src="/images/hero_kings.jpg"
            alt="KINGS campus building"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[50%_35%]"
          />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,24,42,0.9)_0%,rgba(8,24,42,0.66)_45%,rgba(8,24,42,0.2)_80%,rgba(8,24,42,0.06)_100%)]" />

        <div className="relative mx-auto w-full max-w-7xl px-5 py-12 md:px-6">
          <div className="max-w-[680px]">
            <p className="m-0 text-[12px] font-bold uppercase tracking-[0.18em] text-white/70">
              International Nuclear Cooperation
            </p>
            <h1 className="mt-4 text-5xl font-black tracking-[-0.055em] text-white md:text-6xl">INC</h1>
            <p className="mt-4 max-w-[610px] text-base leading-7 text-white/85 md:text-lg">
              {en
                ? "The official INC website connecting nuclear research and international cooperation networks in Korea."
                : "한국 원자력 연구 및 국제 협력 네트워크를 이끄는 INC 공식 홈페이지입니다."}
            </p>

            <form action="/search" method="get" role="search" className="mt-7 flex max-w-[560px] gap-2">
              <label className="relative flex-1">
                <span className="sr-only">{en ? "Search the archive" : "자료 검색"}</span>
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                <input
                  name="q"
                  type="search"
                  placeholder={en ? "Search issues, reports, seminars" : "자료 검색 (예: SMR, 우라늄)"}
                  className="h-12 w-full rounded-md border border-white/30 bg-white pl-10 pr-3 text-[15px] text-slate-900 shadow-sm outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-white/60"
                />
              </label>
              <button type="submit" className="h-12 shrink-0 rounded-md bg-[#174A7E] px-5 text-sm font-bold text-white transition hover:bg-[#103A66]">
                {en ? "Search" : "검색"}
              </button>
            </form>

            <div className="mt-4 flex flex-wrap gap-2.5">
              <Link
                href="/notice"
                className="inline-flex h-10 items-center gap-2 rounded-md bg-white/95 px-4 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-white"
              >
                {en ? "Notices" : "공지사항"}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/resources"
                className="inline-flex h-10 items-center gap-2 rounded-md bg-white/95 px-4 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-white"
              >
                {en ? "Resources" : "자료실"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-12 md:px-6 md:py-16">
        <PublicationHighlights atm={latestAtm} heartbeat={latestHeartbeat} en={en} />

        <LatestTabs locale={locale} notices={latestNotices} resources={latestResources} featuredEvent={featuredEvent} />

        <section className="mt-16 md:mt-20">
          <div className="flex items-end justify-between gap-4 border-b border-slate-300 pb-4">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#2B6CA3]">Resources</p>
              <h2 className="mt-1 text-[26px] font-semibold tracking-[-0.025em] text-slate-950">{en ? "Resource Categories" : "자료 카테고리"}</h2>
            </div>
            <Link href="/resources" className="inline-flex items-center gap-1 text-[15px] font-semibold text-slate-600 hover:text-[#174A7E]">
              {en ? "All" : "전체 자료실"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Compact tiles: two per row on phones so the list stays short. */}
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {RESOURCE_BOARDS.map((b) => (
              <Link
                key={b.slug}
                href={`/resources/${b.slug}`}
                className="group flex min-h-[64px] items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-4 py-3 transition hover:border-[#2B6CA3] hover:bg-[#F7FAFC]"
              >
                <span className="text-[15px] font-semibold leading-6 text-slate-900 group-hover:text-[#174A7E]">{en ? b.labelEn : b.label}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#174A7E]" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

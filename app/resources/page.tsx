import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, FileText, Newspaper, Search } from "lucide-react";
import { RESOURCE_BOARDS } from "@/lib/resourceBoards";
import { getLocale, pick } from "@/lib/i18n";
import { fetchBoardStats, fetchEventStats } from "@/lib/resourceHub";
import { fetchLatestIssue, issueLabel } from "@/lib/publications";

// The landing page groups the eleven boards by what they hold, and every card
// shows real figures (items, latest addition) instead of a bare link.
const GROUPS = [
  {
    key: "publications",
    title: ["정기 간행물", "Publications"],
    desc: ["매일·격주로 발행되는 원자력 동향 리포트", "Daily and biweekly nuclear industry reports"],
    slugs: ["atm", "heartbeat-of-atoms"],
  },
  {
    key: "events",
    title: ["행사 자료", "Events"],
    desc: ["세미나·워크숍·공모전의 포스터, 사진, 발표 자료", "Posters, photos and talks from seminars, workshops and contests"],
    slugs: ["seminar", "workshop", "midterm-report", "essay-contest", "shortform-contest"],
  },
  {
    key: "reports",
    title: ["보고서·기고", "Reports & writing"],
    desc: ["강연 자료, 전문가 의견, 기고문과 보고서", "Lectures, expert opinions, contributions and reports"],
    slugs: ["lecture", "expert-opinion-report", "contribution", "misc-reports"],
  },
] as const;

const EVENT_CATEGORY: Record<string, string> = {
  seminar: "seminar",
  workshop: "workshop",
  "midterm-report": "project_report",
  "essay-contest": "essay_contest",
  "shortform-contest": "shortform_contest",
};

export default async function ResourcesIndex() {
  const locale = await getLocale();
  const en = locale === "en";
  const [boardStats, eventStats, atm, heartbeat] = await Promise.all([
    fetchBoardStats(),
    fetchEventStats(),
    fetchLatestIssue("atm"),
    fetchLatestIssue("heartbeat-of-atoms"),
  ]);
  const stat = (slug: string) => boardStats.find((s) => s.slug === slug);
  const eventStat = (slug: string) => eventStats.find((e) => e.category === EVENT_CATEGORY[slug]);
  const label = (slug: string) => {
    const b = RESOURCE_BOARDS.find((x) => x.slug === slug);
    return b ? (en ? b.labelEn : b.label) : slug;
  };
  const total = boardStats.reduce((n, s) => n + s.count, 0);

  return (
    <main className="min-h-screen bg-[#F6F7F9]">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-12 md:px-6 md:py-14">
          <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#2B6CA3]">Resources</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.035em] text-slate-950 md:text-4xl">{pick(locale, "자료실", "Resources")}</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-600">
            {en
              ? `${total.toLocaleString()} public items across publications, events and reports.`
              : `정기 간행물, 행사 자료, 보고서까지 공개 자료 ${total.toLocaleString()}건을 모았습니다.`}
          </p>
          <form action="/search" method="get" role="search" className="mt-7 flex max-w-xl gap-2">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">{pick(locale, "자료 검색", "Search resources")}</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
              <input
                name="q"
                type="search"
                placeholder={pick(locale, "자료 검색 (예: SMR, 우라늄)", "Search (e.g. SMR, uranium)")}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-[15px] text-slate-900 outline-none transition focus:border-[#2B6CA3] focus:ring-2 focus:ring-[#2B6CA3]/10"
              />
            </label>
            <button type="submit" className="h-12 shrink-0 rounded-xl bg-[#174A7E] px-5 text-sm font-bold text-white transition hover:bg-[#103A66]">
              {pick(locale, "검색", "Search")}
            </button>
          </form>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-14 px-5 py-12 md:px-6 md:py-14">
        {GROUPS.map((group) => (
          <section key={group.key} aria-labelledby={`grp-${group.key}`}>
            <div className="mb-5">
              <h2 id={`grp-${group.key}`} className="text-[22px] font-bold tracking-[-0.02em] text-slate-950">
                {en ? group.title[1] : group.title[0]}
              </h2>
              <p className="mt-1 text-sm text-slate-600">{en ? group.desc[1] : group.desc[0]}</p>
            </div>

            {group.key === "publications" ? (
              <div className="grid gap-5 md:grid-cols-2">
                {[
                  { slug: "atm", latest: atm, icon: Newspaper },
                  { slug: "heartbeat-of-atoms", latest: heartbeat, icon: BookOpen },
                ].map(({ slug, latest, icon: Icon }) => {
                  const s = stat(slug);
                  const headline =
                    latest?.content.kind === "atm"
                      ? latest.content.atm.items[0]?.title
                      : latest?.content.kind === "heartbeat"
                        ? latest.content.heartbeat.column?.title ?? null
                        : null;
                  return (
                    <Link
                      key={slug}
                      href={`/resources/${slug}`}
                      className="group flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#174A7E] text-white" aria-hidden="true">
                          <Icon className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-[18px] font-bold text-slate-950">{label(slug)}</p>
                          <p className="text-[13px] text-slate-600">
                            {en ? `${s?.count ?? 0} issues` : `${(s?.count ?? 0).toLocaleString()}호 발행`} ·{" "}
                            {slug === "atm" ? (en ? "weekdays" : "평일 매일") : en ? "biweekly" : "격주"}
                          </p>
                        </div>
                      </div>
                      {latest ? (
                        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                          <p className="text-[12px] font-semibold text-[#2B6CA3]">
                            {en ? "Latest" : "최신호"} {issueLabel(latest.issue.title)} · {latest.issue.published_at}
                          </p>
                          {headline ? <p className="mt-1 line-clamp-2 text-[15px] font-semibold leading-6 text-slate-900">{headline}</p> : null}
                        </div>
                      ) : null}
                      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-[#174A7E]">
                        {en ? "Browse all issues" : "전체 호 보기"}
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.slugs.map((slug) => {
                  const ev = group.key === "events" ? eventStat(slug) : undefined;
                  const s = stat(slug);
                  const latestTitle = ev?.latestTitle ?? s?.latestTitle;
                  const latestDate = ev?.latestDate ?? s?.latestDate;
                  const Icon = group.key === "events" ? CalendarDays : FileText;
                  return (
                    <Link
                      key={slug}
                      href={`/resources/${slug}`}
                      className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-[#9BB9D6] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF4FA] text-[#174A7E]" aria-hidden="true">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-semibold text-slate-700">
                          {ev ? (en ? `${ev.count} events` : `행사 ${ev.count}건`) : en ? `${s?.count ?? 0} items` : `자료 ${s?.count ?? 0}건`}
                        </span>
                      </div>
                      <p className="mt-4 text-[17px] font-bold text-slate-950 group-hover:text-[#174A7E]">{label(slug)}</p>
                      {latestTitle ? (
                        <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-slate-600">
                          <span className="font-semibold text-slate-700">{en ? "Latest: " : "최근: "}</span>
                          {latestTitle}
                          {latestDate ? <span className="text-slate-500"> · {latestDate}</span> : null}
                        </p>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}

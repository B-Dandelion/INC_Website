import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { RESOURCE_BOARDS } from "@/lib/resourceBoards";
import { getLocale, pick } from "@/lib/i18n";

export default async function ResourcesIndex() {
  const locale = await getLocale();

  return (
    <main className="min-h-screen bg-[#F6F7F9]">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-12 md:px-6 md:py-16">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#2B6CA3]">Resources</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-slate-950 md:text-4xl">
            {pick(locale, "자료실", "Resources")}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 md:text-[15px]">
            {pick(
              locale,
              "카테고리별 자료를 확인하거나 통합 검색으로 필요한 자료를 빠르게 찾을 수 있습니다.",
              "Browse materials by category or use site search to find what you need quickly.",
            )}
          </p>

          <form action="/search" method="get" role="search" className="mt-7 flex max-w-xl gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                name="q"
                type="search"
                aria-label={pick(locale, "사이트 검색", "Site search")}
                placeholder={pick(locale, "자료·공지·이벤트 검색", "Search resources, notices, events")}
                className="h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-[#2B6CA3] focus:ring-2 focus:ring-[#2B6CA3]/10"
              />
            </div>
            <button
              type="submit"
              className="h-11 shrink-0 rounded-md bg-[#174A7E] px-5 text-sm font-bold text-white transition hover:bg-[#103A66]"
            >
              {pick(locale, "검색", "Search")}
            </button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10 md:px-6 md:py-14">
        <div className="mb-4 flex items-end justify-between border-b border-slate-300 pb-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#2B6CA3]">Archive</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              {pick(locale, "자료 카테고리", "Resource Categories")}
            </h2>
          </div>
          <span className="text-xs font-medium tabular-nums text-slate-400">{RESOURCE_BOARDS.length}</span>
        </div>

        <div className="grid border-x border-t border-slate-200 bg-white sm:grid-cols-2 lg:grid-cols-3">
          {RESOURCE_BOARDS.map((board) => (
            <Link
              key={board.slug}
              href={`/resources/${board.slug}`}
              className="group flex min-h-[108px] items-center justify-between gap-4 border-b border-r border-slate-200 px-5 py-5 transition hover:bg-slate-50"
            >
              <div className="min-w-0">
                <div className="text-[16px] font-semibold leading-6 text-slate-900 transition group-hover:text-[#174A7E]">
                  {locale === "en" ? board.labelEn : board.label}
                </div>
                {locale === "en" && board.labelEn !== board.label ? (
                  <div className="mt-1 text-xs text-slate-400">{board.label}</div>
                ) : null}
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#174A7E]" />
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

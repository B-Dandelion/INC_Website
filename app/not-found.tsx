import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { getLocale, pick } from "@/lib/i18n";

export default async function NotFound() {
  const locale = await getLocale();

  return (
    <main className="min-h-[calc(100vh-72px)] bg-[#F6F7F9] px-5 py-16 md:py-24">
      <div className="mx-auto max-w-3xl border border-slate-200 bg-white px-6 py-12 text-center md:px-10 md:py-16">
        <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#2B6CA3]">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-slate-950 md:text-4xl">
          {pick(locale, "페이지를 찾을 수 없습니다", "Page Not Found")}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-500 md:text-[15px]">
          {pick(
            locale,
            "주소가 변경되었거나 페이지가 삭제되었을 수 있습니다. 아래 메뉴에서 원하는 내용을 다시 찾아보세요.",
            "The page may have moved or no longer exists. Use the options below to find what you were looking for.",
          )}
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-2.5">
          <Link
            href="/"
            className="inline-flex h-10 items-center gap-1.5 rounded-md bg-[#174A7E] px-4 text-sm font-bold text-white transition hover:bg-[#103A66]"
          >
            <ArrowLeft className="h-4 w-4" />
            {pick(locale, "홈으로", "Back to Home")}
          </Link>
          <Link
            href="/resources"
            className="inline-flex h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {pick(locale, "자료실", "Resources")}
          </Link>
          <Link
            href="/search"
            className="inline-flex h-10 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Search className="h-4 w-4" />
            {pick(locale, "통합 검색", "Site Search")}
          </Link>
        </div>
      </div>
    </main>
  );
}

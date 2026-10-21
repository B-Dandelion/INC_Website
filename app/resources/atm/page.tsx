import Link from "next/link";
import PublicationIssueList from "@/components/resources/PublicationIssueList";
import { getLocale } from "@/lib/i18n";
import { makeMetadata } from "@/lib/seo";

export const metadata = makeMetadata({
  title: "ATM — 원자력 뉴스 요약",
  description: "평일 매일 발행되는 INC의 ATM: 국내외 원자력 뉴스 3건 요약. 지난 호를 웹페이지와 PDF로 볼 수 있습니다.",
  path: "/resources/atm",
});

function isYmd(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; d?: string; dir?: string }>;
}) {
  const locale = await getLocale();
  const en = locale === "en";
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const d = isYmd(sp.d) ? sp.d : "";
  const dir = sp.dir === "after" ? "after" : "before";
  const publishedFrom = d && dir === "after" ? d : undefined;
  const publishedTo = d && dir === "before" ? d : undefined;

  const makePageHref = (p: number) => {
    const qs = new URLSearchParams();
    if (p > 1) qs.set("page", String(p));
    if (d) qs.set("d", d);
    if (d) qs.set("dir", dir);
    const s = qs.toString();
    return `/resources/atm${s ? `?${s}` : ""}`;
  };

  // Jump to a date: issues on or before / on or after it.
  const filter = (
    <form method="get" action="/resources/atm" className="flex flex-wrap items-center gap-2">
      <input
        type="date"
        name="d"
        defaultValue={d}
        aria-label={en ? "Publication date" : "발간일"}
        className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-[#2B6CA3] focus:ring-2 focus:ring-[#2B6CA3]/10"
      />
      <select
        name="dir"
        defaultValue={dir}
        aria-label={en ? "Date direction" : "날짜 기준"}
        className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-[#2B6CA3]"
      >
        <option value="before">{en ? "On or before" : "이전 호"}</option>
        <option value="after">{en ? "On or after" : "이후 호"}</option>
      </select>
      <button type="submit" className="h-10 rounded-lg bg-[#174A7E] px-4 text-sm font-bold text-white transition hover:bg-[#103A66]">
        {en ? "Go" : "이동"}
      </button>
      {d ? (
        <Link href="/resources/atm" className="h-10 rounded-lg px-3 text-sm font-semibold leading-10 text-slate-600 hover:text-[#174A7E]">
          {en ? "Clear" : "해제"}
        </Link>
      ) : null}
    </form>
  );

  return (
    <PublicationIssueList slug="atm" page={page} publishedFrom={publishedFrom} publishedTo={publishedTo} filter={filter} makePageHref={makePageHref} />
  );
}

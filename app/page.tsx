import Link from "next/link";
import LatestTabs from "@/components/home/LatestTabs";
import { RESOURCE_BOARDS } from "@/lib/resourceBoards";
import { fetchPublicResources } from "@/lib/resourcesDb";
import { fetchHomepagePromotion } from "@/lib/promotionalEventsDb";
import Image from "next/image";
import { fetchNotices } from "@/lib/noticesDb";
import { ArrowRight } from "lucide-react";

function todayInKorea() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default async function HomePage() {
  const allResources = await fetchPublicResources();
  const latestResources = (allResources ?? []).slice(0, 5).map((r: any, idx: number) => ({
    id: String(r.id ?? r.resource_id ?? r.slug ?? `res-${idx}`),
    title: r.title ?? "제목 없음",
    date: (r.posted_at ?? r.published_at ?? r.created_at ?? "").toString().slice(0, 10),
    href: r.id ? `/api/resources/go?id=${r.id}` : "/resources",
  }));

  const noticeRows = await fetchNotices({ page: 1, pageSize: 5 });
  const latestNotices = noticeRows.map((n) => ({
    id: String(n.id),
    title: n.title,
    date: (n.posted_at ?? "").toString().slice(0, 10),
    href: `/notice/${n.id}`,
  }));

  const promotion = await fetchHomepagePromotion(todayInKorea());
  const featuredEvent = promotion
    ? {
        id: promotion.id,
        title: promotion.title_ko,
        summary: promotion.summary_ko ?? "행사 상세 내용과 참여 정보를 확인해 주세요.",
        startDate: promotion.event_date ?? "",
        endDate: promotion.period_end ?? "",
      }
    : null;

  return (
    <main className="bg-[#F6F7F9]">
      <section className="relative flex min-h-[470px] items-center overflow-hidden border-b border-slate-200 md:min-h-[560px]">
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
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,24,42,0.88)_0%,rgba(8,24,42,0.62)_42%,rgba(8,24,42,0.14)_76%,rgba(8,24,42,0.03)_100%)]" />

        <div className="relative mx-auto w-full max-w-7xl px-5 py-16 md:px-6">
          <div className="max-w-[680px]">
            <p className="m-0 text-[12px] font-bold uppercase tracking-[0.18em] text-white/70">
              International Nuclear Cooperation
            </p>
            <h1 className="mt-5 text-5xl font-black tracking-[-0.055em] text-white md:text-7xl">
              INC
            </h1>
            <p className="mt-5 max-w-[610px] text-base leading-7 text-white/85 md:text-lg">
              한국 원자력 연구 및 국제 협력 네트워크를 이끄는 INC 공식 홈페이지입니다.
            </p>

            <div className="mt-8 flex flex-wrap gap-2.5">
              <Link
                href="/notice"
                className="inline-flex h-11 items-center gap-2 rounded-md bg-white px-4 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-slate-100"
              >
                공지사항
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/resources"
                className="inline-flex h-11 items-center gap-2 rounded-md border border-white bg-white px-4 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-slate-100"
              >
                자료실
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-14 md:px-6 md:py-18">
        <section>
          <div className="flex items-end justify-between gap-4 border-b border-slate-300 pb-4">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#2B6CA3]">Resources</p>
              <h2 className="mt-1 text-[26px] font-semibold tracking-[-0.025em] text-slate-950">자료 카테고리</h2>
            </div>
            <Link href="/resources" className="hidden items-center gap-1 text-[15px] font-semibold text-slate-600 hover:text-[#174A7E] sm:inline-flex">
              전체 자료실
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid border-x border-b border-slate-200 bg-white sm:grid-cols-2 lg:grid-cols-4">
            {RESOURCE_BOARDS.map((b, index) => (
              <Link
                key={b.slug}
                href={`/resources/${b.slug}`}
                className={`group min-h-[136px] border-slate-200 p-6 transition hover:bg-[#F7FAFC] ${
                  index % 4 !== 3 ? "lg:border-r" : ""
                } ${index % 2 === 0 ? "sm:border-r" : ""} border-b last:border-b-0`}
              >
                <div className="text-[17px] font-semibold leading-7 text-slate-900 group-hover:text-[#174A7E]">{b.label}</div>
                <div className="mt-5 inline-flex items-center gap-1 text-[13px] font-semibold text-slate-500 group-hover:text-[#174A7E]">
                  바로가기
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <LatestTabs notices={latestNotices} resources={latestResources} featuredEvent={featuredEvent} />
      </div>
    </main>
  );
}

import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { getLocale, pick } from "@/lib/i18n";

export default async function AboutPage() {
  const locale = await getLocale();

  return (
    <main className="min-h-screen bg-[#F6F7F9]">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-5 py-12 md:px-6 md:py-16">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#2B6CA3]">About INC</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-slate-950 md:text-4xl">
            {pick(locale, "INC 소개", "About INC")}
          </h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-8 text-slate-600 md:text-base">
            {pick(
              locale,
              "INC 공식 홈페이지는 원자력 분야의 연구 및 국제 협력과 관련된 자료, 공지사항, 행사 정보를 한 곳에서 제공하기 위한 웹사이트입니다.",
              "The official INC website provides resources, notices, and event information related to nuclear research and international cooperation in one place.",
            )}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-10 md:px-6 md:py-14">
        <div className="grid border border-slate-200 bg-white md:grid-cols-2">
          <div className="border-b border-slate-200 p-6 md:border-b-0 md:border-r md:p-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#2B6CA3]">Resources</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">
              {pick(locale, "자료와 기록", "Resources and Archives")}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              {pick(
                locale,
                "ATM, Heartbeat of Atoms, 강연·세미나·보고서 등 공개 자료를 카테고리별로 확인할 수 있습니다.",
                "Browse public materials including ATM, Heartbeat of Atoms, lectures, seminars, reports, and more by category.",
              )}
            </p>
            <Link href="/resources" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#174A7E] hover:underline">
              {pick(locale, "자료실 보기", "Browse Resources")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="p-6 md:p-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#2B6CA3]">Contact</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">
              {pick(locale, "문의 및 협력", "Contact and Cooperation")}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              {pick(
                locale,
                "자료 이용, 게시물, 제휴 및 협력 관련 문의는 대표 연락처를 이용해 주세요.",
                "For questions about materials, publications, partnerships, or cooperation, please use the official contact information.",
              )}
            </p>
            <Link href="/contact" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#174A7E] hover:underline">
              <Mail className="h-4 w-4" />
              {pick(locale, "문의하기", "Contact Us")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

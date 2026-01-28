import Link from "next/link";
import LatestTabs from "@/components/home/LatestTabs";
import { RESOURCE_BOARDS } from "@/lib/resourceBoards";
import { fetchPublicResources } from "@/lib/resourcesDb";

export default async function HomePage() {
  // 자료실 최신 업로드 (함수 시그니처에 맞게 조절)
  const allResources = await fetchPublicResources();
const latestResources = (allResources ?? []).slice(0, 5).map((r: any, idx: number) => ({
  id: String(r.id ?? r.resource_id ?? r.slug ?? `res-${idx}`), // 너 DB에 맞춰
  title: r.title ?? "제목 없음",
  date: (r.date ?? r.created_at ?? "").toString().slice(0, 10),
  href: r.id ? `/resources/${r.id}` : "/resources",
}));

  // 공지사항은 아직 없으면 임시로 넣어도 됨(완성도용)
const latestNotices = [
  { id: "notice-1", title: "홈페이지 개편 안내", date: "2026-01-05", href: "/notices/1" },
  { id: "notice-2", title: "국제협력 세미나 참가 신청", date: "2026-01-02", href: "/notices/2" },
  { id: "notice-3", title: "연구자료 이용 가이드", date: "2025-12-20", href: "/notices/3" },
];

  return (
    <main className="bg-gray-50">
      {/* Hero */}
      <section className="border-b border-gray-200 bg-gradient-to-b from-blue-50 to-white">
        <div className="mx-auto max-w-7xl px-6 py-14 text-center">
          <div className="text-xs font-bold tracking-widest text-gray-500">
            International Nuclear Cooperation
          </div>
          <h1 className="mt-3 text-5xl font-black text-[#2563EB]">INC</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-gray-700">
            한국 원자력 연구 및 국제 협력 네트워크를 이끄는 INC 공식 홈페이지입니다.
          </p>

          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/notices"
              className="rounded-xl bg-[#2563EB] px-5 py-3 text-sm font-extrabold text-white hover:bg-[#1D4ED8]"
            >
              공지사항
            </Link>
            <Link
              href="/resources"
              className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-extrabold text-gray-900 hover:border-gray-300"
            >
              자료실
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Quick Links */}
        <section>
          <h2 className="text-xl font-extrabold text-gray-900">Quick Links</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {[
              { title: "INC 소개", desc: "기관 개요 및 비전", href: "/about" },
              { title: "연구진", desc: "연구진 및 연구 분야", href: "/people" },
              { title: "국제교류", desc: "국제 협력 및 교류 활동", href: "/exchange" },
              { title: "자료실", desc: "보고서·발간물·자료", href: "/resources" },
              { title: "공지사항", desc: "최신 공지 및 안내", href: "/notices" },
              { title: "문의", desc: "연락처 및 문의", href: "/contact" },
            ].map((x) => (
              <Link
                key={x.href}
                href={x.href}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:border-gray-300"
              >
                <div className="text-base font-extrabold text-gray-900">{x.title}</div>
                <div className="mt-1 text-sm text-gray-600">{x.desc}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* Categories */}
        <section className="mt-10">
          <div className="flex items-end justify-between">
            <h2 className="text-xl font-extrabold text-gray-900">카테고리</h2>
            <Link href="/resources" className="text-sm font-bold text-[#2563EB] hover:underline">
              자료실로 이동 →
            </Link>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {RESOURCE_BOARDS.map((b) => (
              <Link
                key={b.slug}
                href={`/resources?cat=${b.slug}`}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:border-gray-300"
              >
                <div className="text-base font-extrabold text-gray-900">{b.label}</div>
                <div className="mt-2 text-sm font-bold text-[#2563EB]">바로가기 →</div>
              </Link>
            ))}
          </div>
        </section>

        {/* Latest (토글) */}
        <LatestTabs notices={latestNotices} resources={latestResources} />
      </div>
    </main>
  );
}

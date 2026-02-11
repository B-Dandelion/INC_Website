import Link from "next/link";
import LatestTabs from "@/components/home/LatestTabs";
import { RESOURCE_BOARDS } from "@/lib/resourceBoards";
import { fetchPublicResources } from "@/lib/resourcesDb";
import Image from "next/image";


export default async function HomePage() {
  // 자료실 최신 업로드
  const allResources = await fetchPublicResources();
  const latestResources = (allResources ?? []).slice(0, 5).map((r: any, idx: number) => ({
    id: String(r.id ?? r.resource_id ?? r.slug ?? `res-${idx}`),
    title: r.title ?? "제목 없음",
    date: (r.date ?? r.created_at ?? "").toString().slice(0, 10),
    href: r.id ? `/resources/${r.id}` : "/resources",
  }));
  const latestNotices = [
    { id: "notice-1", title: "홈페이지 개편 안내", date: "2026-01-05", href: "/notices/1" },
    { id: "notice-2", title: "국제협력 세미나 참가 신청", date: "2026-01-02", href: "/notices/2" },
    { id: "notice-3", title: "연구자료 이용 가이드", date: "2025-12-20", href: "/notices/3" },
  ];

  return (
    <main className="bg-gray-50">
      {/* Hero */}
      <section className="relative border-b border-gray-200">
        {/* 배경 이미지 */}
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

        {/* 가독성 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent" />

        {/* 내용 */}
        <div className="relative mx-auto max-w-7xl px-6 py-16 md:py-24">
          <div className="max-w-2xl text-left">
            <div className="text-xs font-bold tracking-widest text-white/80">
              International Nuclear Cooperation
            </div>

            <h1 className="mt-3 text-6xl md:text-7xl font-black text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.65)]">
              INC
            </h1>
            <p className="mt-4 max-w-xl text-sm md:text-base text-white/90">
              한국 원자력 연구 및 국제 협력 네트워크를 이끄는 INC 공식 홈페이지입니다.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/notices"
                className="rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-gray-900 hover:bg-white/90"
              >
                공지사항
              </Link>
              <Link
                href="/resources"
                className="rounded-xl border border-white/40 bg-white/10 px-5 py-3 text-sm font-extrabold text-white hover:bg-white/20"
              >
                자료실
              </Link>
            </div>
          </div>
        </div>

        {/* 섹션 높이 확보용 (이미지 위에 내용이 얹히도록) */}
        <div className="h-[420px] md:h-[560px]" />
      </section>
      <div className="mx-auto max-w-7xl px-6 py-10">

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
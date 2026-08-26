import Link from "next/link";
import { fetchBoards } from "@/lib/resourcesDb";
import { ArrowRight, CalendarDays, FileText, LogOut, Megaphone } from "lucide-react";

export default async function AdminResourcesHome() {
  const boards = await fetchBoards();

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-12 md:px-6 md:py-16">
      <section className="border-b border-slate-300 pb-6">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#2B6CA3]">INC Administration</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-slate-950">콘텐츠 관리</h1>
            <p className="mt-2 text-sm text-slate-500">자료실, 공지사항, 이벤트를 관리할 수 있습니다.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin-x7k3p9/notices"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              <Megaphone className="h-4 w-4" />
              공지사항 관리
            </Link>
            <Link
              href="/admin-x7k3p9/events"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              <CalendarDays className="h-4 w-4" />
              이벤트 관리
            </Link>
            <form action="/api/admin/logout" method="post">
              <button
                type="submit"
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
              >
                <LogOut className="h-4 w-4" />
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">자료실 카테고리</h2>
            <p className="mt-1 text-sm text-slate-500">관리할 카테고리를 선택하세요.</p>
          </div>
          <span className="text-xs font-medium text-slate-400">{boards.length} categories</span>
        </div>

        <div className="grid overflow-hidden border border-slate-200 bg-white sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((b, index) => (
            <Link
              key={b.slug}
              href={`/admin-x7k3p9/resources/${b.slug}`}
              className={`group flex min-h-[132px] flex-col justify-between border-slate-200 p-5 transition hover:bg-slate-50 ${
                index % 3 !== 2 ? "lg:border-r" : ""
              } ${index % 2 === 0 ? "sm:border-r" : ""} border-b`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#EEF4FA] text-[#174A7E]">
                  <FileText className="h-4 w-4" />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#174A7E]" />
              </div>
              <div className="mt-5">
                <div className="text-sm font-semibold text-slate-900 group-hover:text-[#174A7E]">{b.title}</div>
                <div className="mt-1 text-xs text-slate-400">{b.slug}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

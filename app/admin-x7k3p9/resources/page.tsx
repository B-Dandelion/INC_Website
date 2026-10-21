import Link from "next/link";
import { fetchBoards } from "@/lib/resourcesDb";
import { ArrowRight, FileText } from "lucide-react";
import { PageHeader } from "@/components/admin/ui";

export default async function AdminResourcesHome() {
  const boards = await fetchBoards();

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 md:px-6 md:py-10">
      <PageHeader title="자료실 관리" description="게시판을 선택해 자료를 올리고, 고치고, 공개 범위를 바꿀 수 있습니다." />

      <section className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">게시판</h2>
          </div>
          <span className="text-xs font-medium text-slate-500">{boards.length}개</span>
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
                <div className="mt-1 text-xs text-slate-500">{b.slug}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

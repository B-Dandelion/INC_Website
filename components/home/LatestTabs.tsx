"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useState } from "react";

type Item = { id: string; title: string; date: string; href: string };

export default function LatestTabs({
  notices,
  resources,
}: {
  notices: Item[];
  resources: Item[];
}) {
  const [tab, setTab] = useState<"notice" | "resource">("notice");
  const items = tab === "notice" ? notices : resources;
  const visible = items.slice(0, 4);

  return (
    <section className="mt-16 md:mt-20">
      <div className="flex flex-col justify-between gap-5 border-b border-slate-300 pb-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#2B6CA3]">Latest updates</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.025em] text-slate-950">최근 소식</h2>
          <p className="mt-1 text-sm text-slate-500">최근 등록된 공지사항과 자료를 확인할 수 있습니다.</p>
        </div>

        <div className="flex items-center gap-5" role="tablist" aria-label="최근 소식 구분">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "notice"}
            onClick={() => setTab("notice")}
            className={`border-b-2 pb-2 text-sm font-semibold transition ${
              tab === "notice"
                ? "border-[#174A7E] text-[#174A7E]"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            공지사항
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "resource"}
            onClick={() => setTab("resource")}
            className={`border-b-2 pb-2 text-sm font-semibold transition ${
              tab === "resource"
                ? "border-[#174A7E] text-[#174A7E]"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            자료실
          </button>
        </div>
      </div>

      <div className="grid gap-6 pt-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,.55fr)]">
        <div className="border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div className="text-sm font-semibold text-slate-900">
              {tab === "notice" ? "공지사항" : "자료실"}
            </div>
            <Link
              href={tab === "notice" ? "/notice" : "/resources"}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-[#174A7E]"
            >
              전체보기
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <ul className="divide-y divide-slate-100">
            {visible.map((it) => (
              <li key={it.id}>
                <Link href={it.href} className="group flex items-center justify-between gap-5 px-5 py-4 transition hover:bg-slate-50/80">
                  <span className="min-w-0 truncate text-sm font-medium text-slate-800 group-hover:text-[#174A7E]">{it.title}</span>
                  <span className="shrink-0 text-xs tabular-nums text-slate-400">{it.date}</span>
                </Link>
              </li>
            ))}
            {visible.length === 0 ? (
              <li className="px-5 py-10 text-sm text-slate-400">표시할 항목이 없습니다.</li>
            ) : null}
          </ul>
        </div>

        <aside className="border border-slate-200 bg-[#EEF4FA] p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#2B6CA3]">INC Archive</p>
          <h3 className="mt-3 text-lg font-semibold leading-7 text-slate-950">INC 자료 아카이브</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            ATM, 강연자료, 기고문 등 INC의 주요 자료를 카테고리별로 확인할 수 있습니다.
          </p>
          <Link
            href="/resources"
            className="mt-7 inline-flex items-center gap-1.5 border-b border-[#174A7E] pb-1 text-sm font-semibold text-[#174A7E] transition hover:text-[#103A66]"
          >
            자료실 둘러보기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </aside>
      </div>
    </section>
  );
}

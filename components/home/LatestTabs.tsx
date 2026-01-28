"use client";

import Link from "next/link";
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
  const visible = items.slice(0, 3); // 최대 3개만

  return (
    <section className="mt-10">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">Latest</h2>
          <p className="mt-1 text-sm text-gray-600">최근 업데이트된 공지와 자료를 확인하세요.</p>
        </div>

        <div className="flex items-center gap-2 rounded-full bg-gray-100 p-1">
          <button
            onClick={() => setTab("notice")}
            className={`px-4 py-2 text-sm font-bold rounded-full ${
              tab === "notice" ? "bg-white shadow-sm text-[#2563EB]" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            공지사항
          </button>
          <button
            onClick={() => setTab("resource")}
            className={`px-4 py-2 text-sm font-bold rounded-full ${
              tab === "resource" ? "bg-white shadow-sm text-[#2563EB]" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            자료실
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="text-sm font-extrabold text-gray-900">
              {tab === "notice" ? "공지사항" : "자료실"}
            </div>
            <Link
              href={tab === "notice" ? "/notices" : "/resources"}
              className="text-sm font-bold text-[#2563EB] hover:underline"
            >
              더보기 →
            </Link>
          </div>

          <ul className="divide-y divide-gray-100">
            {visible.map((it) => (
              <li key={it.id} className="px-5 py-4">
                <Link href={it.href} className="group flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-gray-900 group-hover:text-[#2563EB]">
                      {it.title}
                    </div>
                  </div>
                  <div className="shrink-0 text-xs text-gray-500">{it.date}</div>
                </Link>
              </li>
            ))}
            {visible.length === 0 ? (
              <li className="px-5 py-8 text-sm text-gray-500">표시할 항목이 없습니다.</li>
            ) : null}
          </ul>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-6 shadow-sm">
          <div className="text-sm font-extrabold text-[#2563EB]">행사</div>
          <div className="mt-2 text-lg font-extrabold text-gray-900">
            INC Open Forum (온라인) - 사전등록
          </div>
          <div className="mt-2 text-sm text-gray-700">
            일정과 신청 안내는 상세 페이지에서 확인할 수 있습니다.
          </div>
          <Link
            href="/events"
            className="mt-5 inline-flex rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-extrabold text-white hover:bg-[#1D4ED8]"
          >
            행사 보기 →
          </Link>
        </div>
      </div>
    </section>
  );
}
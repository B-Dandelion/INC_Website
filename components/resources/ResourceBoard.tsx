"use client";

import Link from "next/link";

type Item = { id: string; title: string; date: string; href: string };

export default function ResourceBoard({
  items,
  total,
  page,
  pageSize,
  baseHref,
  query,
}: {
  items: Item[];
  total: number;
  page: number;
  pageSize: number;
  baseHref: string;
  query?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const mkHref = (p: number) => {
    const sp = new URLSearchParams();
    if (p > 1) sp.set("page", String(p));
    if (query) sp.set("q", query);
    const qs = sp.toString();
    return qs ? `${baseHref}?${qs}` : baseHref;
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="text-sm font-extrabold text-gray-900">목록</div>
        <div className="text-xs text-gray-500">총 {total}개</div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="w-24 px-5 py-3 text-left font-bold">번호</th>
              <th className="px-5 py-3 text-left font-bold">제목</th>
              <th className="w-40 px-5 py-3 text-left font-bold">등록일</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((it, idx) => (
              <tr key={it.id} className="hover:bg-gray-50">
                <td className="px-5 py-4 text-gray-500">{total - ((page - 1) * pageSize + idx)}</td>
                <td className="px-5 py-4">
                  <Link href={it.href} className="font-semibold text-gray-900 hover:text-[#2563EB]">
                    {it.title}
                  </Link>
                </td>
                <td className="px-5 py-4 text-gray-500">{it.date}</td>
              </tr>
            ))}

            {items.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-5 py-10 text-center text-gray-500">
                  표시할 항목이 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
        <div className="text-xs text-gray-500">
          {page} / {totalPages}
        </div>
        <div className="flex gap-2">
          <Link
            href={mkHref(Math.max(1, page - 1))}
            className={`rounded-lg px-3 py-2 text-xs font-bold border ${
              page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-gray-50"
            }`}
          >
            이전
          </Link>
          <Link
            href={mkHref(Math.min(totalPages, page + 1))}
            className={`rounded-lg px-3 py-2 text-xs font-bold border ${
              page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-gray-50"
            }`}
          >
            다음
          </Link>
        </div>
      </div>
    </div>
  );
}
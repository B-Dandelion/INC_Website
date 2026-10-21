// components/resources/DocumentBoardPage.tsx
// Report-type boards (기고문, 전문가 의견 보고서, 기타 보고서): document cards in
// a grid with search inside the board and numbered pages.
import Link from "next/link";
import { Search } from "lucide-react";
import ResourcesFrame, { type ResourceNavKey } from "./ResourcesFrame";
import BoardHeader from "./BoardHeader";
import DocumentCard, { fileType } from "./DocumentCard";
import Pager from "./Pager";
import { getLocale } from "@/lib/i18n";
import { countResources, fetchResources } from "@/lib/resourcesDb";

const PAGE_SIZE = 20;

export default async function DocumentBoardPage({
  slug,
  title,
  titleEn,
  description,
  descriptionEn,
  page,
  q,
}: {
  slug: ResourceNavKey;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  page: number;
  q: string;
}) {
  const locale = await getLocale();
  const en = locale === "en";
  const query = q.replace(/[,()%*\\]/g, " ").trim().slice(0, 80);
  const args = { boardSlug: slug, page, pageSize: PAGE_SIZE, q: query || undefined };
  const [rows, total, allCount] = await Promise.all([
    fetchResources(args),
    countResources(args),
    query ? countResources({ boardSlug: slug }) : Promise.resolve(null),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: number) => {
    const sp = new URLSearchParams();
    if (query) sp.set("q", query);
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return `/resources/${slug}${s ? `?${s}` : ""}`;
  };

  const types = [...new Set(rows.map((r) => fileType(r).label))];
  const latest = rows[0]?.posted_at?.slice(0, 10);
  const facts = [
    en ? `${allCount ?? total} documents` : `자료 ${(allCount ?? total).toLocaleString()}건`,
    ...(latest && !query ? [en ? `Updated ${latest}` : `최근 등록 ${latest}`] : []),
    ...(types.length && !query ? [types.join(" · ")] : []),
  ];

  return (
    <ResourcesFrame activeKey={slug}>
      <div className="mx-auto max-w-[1040px] pb-12">
        <BoardHeader group={en ? "Reports & writing" : "보고서·기고"} title={en ? titleEn : title} description={en ? descriptionEn : description} facts={facts} en={en}>
          <form action={`/resources/${slug}`} method="get" role="search" className="flex max-w-lg gap-2">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">{en ? "Search this board" : "이 게시판에서 검색"}</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
              <input
                name="q"
                defaultValue={query}
                type="search"
                placeholder={en ? "Search titles and notes" : "제목·설명에서 검색"}
                className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-[#2B6CA3] focus:ring-2 focus:ring-[#2B6CA3]/10"
              />
            </label>
            <button type="submit" className="h-10 rounded-md bg-[#174A7E] px-4 text-sm font-bold text-white transition hover:bg-[#103A66]">
              {en ? "Search" : "검색"}
            </button>
            {query ? (
              <Link href={`/resources/${slug}`} className="h-10 px-2 text-sm font-semibold leading-10 text-slate-600 hover:text-[#174A7E]">
                {en ? "Clear" : "해제"}
              </Link>
            ) : null}
          </form>
          {query ? (
            <p className="mt-3 text-[13px] text-slate-600" aria-live="polite">
              {en ? `${total} results for “${query}”` : `“${query}” 검색 결과 ${total}건`}
            </p>
          ) : null}
        </BoardHeader>

        {rows.length ? (
          <ul className="grid gap-3 md:grid-cols-2">
            {rows.map((row) => (
              <li key={row.id} className="min-w-0">
                <DocumentCard row={row} en={en} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-600">
            {query ? (en ? "Nothing matches this search." : "검색 결과가 없습니다.") : en ? "No documents yet." : "등록된 자료가 없습니다."}
          </div>
        )}

        <Pager page={Math.min(page, pageCount)} pageCount={pageCount} href={href} en={en} />
      </div>
    </ResourcesFrame>
  );
}

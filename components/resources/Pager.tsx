// components/resources/Pager.tsx
// Numbered pagination for public lists: first, last and the pages around the
// current one, with gaps in between (1 … 4 5 6 … 12).
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

function pageWindow(page: number, pageCount: number): (number | "gap")[] {
  const pages = [...new Set([1, pageCount, page - 2, page - 1, page, page + 1, page + 2])]
    .filter((p) => p >= 1 && p <= pageCount)
    .sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  for (const p of pages) {
    const last = out[out.length - 1];
    if (typeof last === "number" && p - last > 1) out.push("gap");
    out.push(p);
  }
  return out;
}

const cell = "inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2.5 text-sm font-semibold tabular-nums transition";

export default function Pager({ page, pageCount, href, en }: { page: number; pageCount: number; href: (p: number) => string; en: boolean }) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label={en ? "Pages" : "페이지"} className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={href(page - 1)} aria-label={en ? "Previous page" : "이전 페이지"} className={`${cell} text-slate-700 hover:bg-white hover:ring-1 hover:ring-slate-200`}>
          <ChevronLeft className="h-4 w-4" />
        </Link>
      ) : null}
      {pageWindow(page, pageCount).map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} className="px-1 text-slate-500" aria-hidden="true">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={href(p)}
            aria-current={p === page ? "page" : undefined}
            className={p === page ? `${cell} bg-[#174A7E] text-white` : `${cell} text-slate-700 hover:bg-white hover:ring-1 hover:ring-slate-200`}
          >
            {p}
          </Link>
        ),
      )}
      {page < pageCount ? (
        <Link href={href(page + 1)} aria-label={en ? "Next page" : "다음 페이지"} className={`${cell} text-slate-700 hover:bg-white hover:ring-1 hover:ring-slate-200`}>
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : null}
    </nav>
  );
}

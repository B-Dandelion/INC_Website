import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "./cn";

// Page numbers around the current page, with first/last always reachable.
function pageWindow(page: number, pageCount: number): (number | "gap")[] {
  const pages = new Set([1, pageCount, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pageCount));
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  for (const p of sorted) {
    const last = out[out.length - 1];
    if (typeof last === "number" && p - last > 1) out.push("gap");
    out.push(p);
  }
  return out;
}

export function Pagination({ page, pageCount, href }: { page: number; pageCount: number; href: (page: number) => string }) {
  if (pageCount <= 1) return null;
  const cell = "inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm font-semibold tabular-nums";
  return (
    <nav aria-label="페이지" className="mt-5 flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={href(page - 1)} className={cn(cell, "border-slate-300 bg-white text-slate-700 hover:bg-slate-50")} aria-label="이전 페이지">
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
            className={cn(cell, p === page ? "border-[#174A7E] bg-[#174A7E] text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50")}
          >
            {p}
          </Link>
        ),
      )}
      {page < pageCount ? (
        <Link href={href(page + 1)} className={cn(cell, "border-slate-300 bg-white text-slate-700 hover:bg-slate-50")} aria-label="다음 페이지">
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : null}
    </nav>
  );
}

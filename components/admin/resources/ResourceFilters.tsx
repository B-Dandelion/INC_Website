"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { RESOURCE_KINDS, VISIBILITIES } from "@/lib/resourceFilters";
import { Select, inputClass } from "../ui/Field";
import { cn } from "../ui/cn";
import { KIND_LABEL, VISIBILITY_LABEL } from "./labels";

// Filters live in the URL so a filtered list can be bookmarked, shared, and
// survives a reload. Typing is debounced; selects apply immediately.
export default function ResourceFilters({ total, from, to }: { total: number; from: number; to: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const debounce = useRef<number | undefined>(undefined);

  function apply(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) sp.set(key, value);
      else sp.delete(key);
    }
    sp.delete("page"); // a new filter always starts from the first page
    const qs = sp.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  function onSearchChange(value: string) {
    setQ(value);
    window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => apply({ q: value.trim() }), 300);
  }

  useEffect(() => () => window.clearTimeout(debounce.current), []);

  const visibility = params.get("visibility") ?? "";
  const kind = params.get("kind") ?? "";
  const filtered = Boolean(params.get("q") || visibility || kind);

  return (
    <div className="mb-3 grid gap-3">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input
            type="search"
            value={q}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                window.clearTimeout(debounce.current);
                apply({ q: q.trim() });
              }
            }}
            placeholder="제목, 파일 이름, 메모로 검색"
            aria-label="자료 검색"
            className={cn(inputClass, "h-10 py-0 pl-9")}
          />
        </div>
        <Select aria-label="공개 범위" value={visibility} onChange={(e) => apply({ visibility: e.target.value })} className="h-10 py-0">
          <option value="">공개 범위 전체</option>
          {VISIBILITIES.map((v) => (
            <option key={v} value={v}>
              {VISIBILITY_LABEL[v]}
            </option>
          ))}
        </Select>
        <Select aria-label="파일 형식" value={kind} onChange={(e) => apply({ kind: e.target.value })} className="h-10 py-0">
          <option value="">형식 전체</option>
          {RESOURCE_KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex min-h-5 items-center gap-3 text-xs text-slate-600" aria-live="polite">
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-label="불러오는 중" /> : null}
        <span className="tabular-nums">{total === 0 ? "0건" : `총 ${total.toLocaleString()}건 중 ${from}–${to}`}</span>
        {filtered ? (
          <button
            type="button"
            onClick={() => {
              setQ("");
              apply({ q: "", visibility: "", kind: "" });
            }}
            className="inline-flex items-center gap-1 font-semibold text-[#174A7E] hover:underline"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            필터 초기화
          </button>
        ) : null}
      </div>
    </div>
  );
}

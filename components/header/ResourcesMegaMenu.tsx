"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { resourceCategories } from "@/lib/resourceCategories";

export default function ResourcesMegaMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openMenu = () => {
    clearCloseTimer();
    setOpen(true);
  };

  const closeMenu = () => {
    clearCloseTimer();
    setOpen(false);
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
    }, 150);
  };

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!open) return;
      const el = rootRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setOpen(false);
    }

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={`inline-flex items-center gap-1.5 text-sm font-semibold transition-colors ${
          open ? "text-[#174A7E]" : "text-slate-700 hover:text-[#174A7E]"
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
        onMouseEnter={openMenu}
        onMouseLeave={scheduleClose}
        onFocus={openMenu}
        onClick={() => setOpen((v) => !v)}
      >
        자료실
        <span className={`text-[10px] text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute left-1/2 top-full z-50 mt-6 w-[min(920px,92vw)] -translate-x-1/2 overflow-hidden rounded-md border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.14)]"
          onMouseEnter={openMenu}
          onMouseLeave={scheduleClose}
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#2B6CA3]">Resources</p>
              <div className="mt-1 text-sm font-semibold text-slate-900">자료실 카테고리</div>
            </div>
            <button
              type="button"
              onClick={closeMenu}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
              aria-label="메뉴 닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3">
            {resourceCategories.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex min-h-[58px] items-center justify-between gap-4 border-b border-r border-slate-100 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-[#174A7E]"
                onClick={closeMenu}
              >
                <span className="truncate">{item.label}</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#174A7E]" />
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-500">필요한 자료를 찾기 어렵다면 상단 검색을 이용해보세요.</div>
            <Link
              href="/resources"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#174A7E] hover:underline"
              onClick={closeMenu}
            >
              자료실 전체보기
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

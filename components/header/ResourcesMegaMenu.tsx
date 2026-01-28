"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { resourceCategories } from "@/lib/resourceCategories"; // 여기만 교체 (flat 11개 배열)

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

  // 버튼 → 패널 이동할 때 바로 닫히는 문제 해결(딜레이 닫기)
  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
    }, 150);
  };

  // 바깥 클릭 닫기
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

  // ESC 닫기
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      {/* 트리거 */}
      <button
        type="button"
        className={`inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-semibold transition
          ${open ? "text-blue-600" : "text-gray-700 hover:text-blue-600"}
        `}
        aria-haspopup="menu"
        aria-expanded={open}
        onMouseEnter={openMenu}
        onMouseLeave={scheduleClose}
        onFocus={openMenu}
        onClick={() => setOpen((v) => !v)} // 클릭 토글
      >
        자료실
        <span className={`transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {/* 패널 */}
      {open && (
        <div
          role="menu"
          className="
            absolute left-1/2 top-full z-50 mt-3 w-[min(980px,92vw)] -translate-x-1/2
            rounded-2xl border border-gray-200 bg-white shadow-xl
          "
          onMouseEnter={openMenu}
          onMouseLeave={scheduleClose}
        >
          {/* 헤더 */}
          <div className="relative px-6 py-2 border-b border-gray-100">
            <button
              type="button"
              onClick={closeMenu}
              className="
                absolute right-4 top-2 inline-flex h-10 w-10 items-center justify-center
                rounded-xl bg-blue-600 text-white shadow-sm
                hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200
              "
              aria-label="메뉴 닫기"
            >
              <X className="h-5 w-5 stroke-[3]" />
            </button>
          </div>

          {/* 그리드: 그룹 대신 11개 카테고리 flat 나열 */}
          <div className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-3">
            <ul className="contents">
              {resourceCategories.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="
                      group flex items-center justify-between rounded-lg px-3 py-2 text-sm
                      text-gray-700 hover:bg-gray-50 hover:text-blue-600
                      focus:outline-none focus:ring-2 focus:ring-blue-200
                    "
                    onClick={closeMenu}
                  >
                    <span className="truncate">{item.label}</span>
                    <span className="opacity-0 transition-opacity group-hover:opacity-100 text-gray-400">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 푸터 */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <div className="text-xs text-gray-500">
              필요한 자료를 찾기 어렵다면 검색을 이용해보세요.
            </div>

            <Link
              href="/resources"
              className="text-xs font-semibold text-blue-600 hover:text-blue-500"
              onClick={closeMenu}
            >
              자료실로 이동 →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
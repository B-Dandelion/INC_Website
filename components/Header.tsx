"use client";

import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import AuthButton from "@/components/AuthButton";
import { RESOURCE_BOARDS } from "@/lib/resourceBoards";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();

  const [lang, setLang] = useState<"KOR" | "ENG">("KOR");

  // 모바일 전체 메뉴(햄버거)
  const [mobileOpen, setMobileOpen] = useState(false);

  // 데스크톱 자료실 드롭다운
  const [resourcesOpen, setResourcesOpen] = useState(false);

  const resourcesWrapRef = useRef<HTMLDivElement | null>(null);

  // 라우트 이동 시 메뉴/드롭다운 닫기
  useEffect(() => {
    setResourcesOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  // 바깥 클릭 시 드롭다운 닫기(데스크톱)
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const el = resourcesWrapRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setResourcesOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const resourceLinks = useMemo(
    () => RESOURCE_BOARDS.map((b) => ({ label: b.label, href: `/resources?cat=${b.slug}` })),
    [],
  );
  
  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* 1) 상단 줄: 로고 + (모바일) 우측 버튼들 */}
        <div className="flex items-center justify-between w-full md:w-auto">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/inc_logo.png"
              alt="INC Logo"
              width={160}
              height={60}
              priority
            />
          </Link>

          {/* 모바일 우측: 로그인/언어/햄버거 */}
          <div className="flex items-center gap-3 md:hidden">
            <AuthButton />

            <button
              onClick={() => setLang("KOR")}
              className={`text-sm ${lang === "KOR" ? "font-bold text-blue-600" : "text-gray-600"
                }`}
            >
              KOR
            </button>
            <span className="text-gray-400">|</span>
            <button
              onClick={() => setLang("ENG")}
              className={`text-sm ${lang === "ENG" ? "font-bold text-blue-600" : "text-gray-600"
                }`}
            >
              ENG
            </button>

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="ml-1 inline-flex items-center justify-center rounded-md border border-gray-200 px-2.5 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              aria-label="메뉴 열기"
              aria-expanded={mobileOpen}
            >
              ☰
            </button>
          </div>
        </div>

        {/* 2) 데스크톱 네비 + 검색/언어/로그인 */}
        <div className="hidden md:flex items-center justify-between w-full md:w-auto gap-6">
          {/* 데스크톱: 자료실 드롭다운 */}
          <nav className="flex items-center gap-4 text-sm font-medium text-gray-700">
            <div className="relative" ref={resourcesWrapRef}>
              <button
                type="button"
                onClick={() => setResourcesOpen((v) => !v)}
                className="inline-flex items-center gap-1 hover:text-blue-600"
                aria-expanded={resourcesOpen}
              >
                자료실 <span className="text-gray-400">▾</span>
              </button>

              {resourcesOpen ? (
                <div className="absolute left-0 mt-3 w-64 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                  <Link
                    href="/resources"
                    className="block px-4 py-2.5 text-sm text-gray-800 hover:bg-gray-50"
                  >
                    전체 보기
                  </Link>
                  <div className="h-px bg-gray-100" />
                  {resourceLinks.map((x) => (
                    <Link
                      key={x.href}
                      href={x.href}
                      className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {x.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </nav>

          {/* 검색 */}
          <div className="relative">
            <input
              type="text"
              placeholder="검색"
              className="border border-gray-300 rounded-full pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
          </div>

          {/* 언어 + 로그인 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang("KOR")}
              className={`text-sm ${lang === "KOR" ? "font-bold text-blue-600" : "text-gray-600"
                }`}
            >
              KOR
            </button>
            <span className="text-gray-400">|</span>
            <button
              onClick={() => setLang("ENG")}
              className={`text-sm ${lang === "ENG" ? "font-bold text-blue-600" : "text-gray-600"
                }`}
            >
              ENG
            </button>
          </div>

          <AuthButton />
        </div>
      </div>

      {/* 3) 모바일 메뉴 패널: hover 없으니 클릭 토글 방식 */}
      {mobileOpen ? (
        <div className="md:hidden border-t border-gray-100 bg-white">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <Link
              href="/resources"
              className="block py-2 text-sm font-semibold text-gray-900"
            >
              자료실 전체 보기
            </Link>

            <div className="mt-2">
              <div className="text-xs font-semibold text-gray-500 mb-2">
                카테고리
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {resourceLinks.map((x) => (
                  <Link
                    key={x.href}
                    href={x.href}
                    className="block py-2 text-sm text-gray-700 hover:text-blue-600"
                  >
                    {x.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-4 relative">
              <input
                type="text"
                placeholder="검색"
                className="w-full border border-gray-300 rounded-full pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
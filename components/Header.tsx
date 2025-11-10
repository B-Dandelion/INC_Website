// components/Header.tsx
"use client";

import Image from "next/image";

import { useState } from "react";
import { Search } from "lucide-react";

export default function Header() {
  const [lang, setLang] = useState<"KOR" | "ENG">("KOR");

  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* 상단 로고 */}
        <div className="flex items-center justify-between w-full md:w-auto">
          <a href="/" className="flex items-center gap-3">
            {/* 이미지 로고 */}
            <Image
              src="/inc_logo.png"   
              alt="INC Logo"
              width={160}           
              height={60}
              priority            
            />
          </a>
          {/* 모바일 언어 선택 */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setLang("KOR")}
              className={`text-sm ${
                lang === "KOR" ? "font-bold text-blue-600" : "text-gray-600"
              }`}
            >
              KOR
            </button>
            <span className="text-gray-400">|</span>
            <button
              onClick={() => setLang("ENG")}
              className={`text-sm ${
                lang === "ENG" ? "font-bold text-blue-600" : "text-gray-600"
              }`}
            >
              ENG
            </button>
          </div>
        </div>

        {/* 네비게이션 메뉴 */}
        <nav className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-sm font-medium text-gray-700">
          <a href="#about" className="hover:text-blue-600">
            INC 소개
          </a>
          <a href="#committee" className="hover:text-blue-600">
            자문위원회
          </a>
          <a href="#researchers" className="hover:text-blue-600">
            연구진
          </a>
          <a href="#partners" className="hover:text-blue-600">
            협력기관
          </a>
          <a href="#exchange" className="hover:text-blue-600">
            국제교류
          </a>
          <a href="#resources" className="hover:text-blue-600">
            자료실
          </a>
          <a href="#notice" className="hover:text-blue-600">
            공지사항
          </a>
          <a href="#forum" className="hover:text-blue-600">
            참여마당
          </a>
        </nav>

        {/* 검색 + 언어 선택 (PC) */}
        <div className="hidden md:flex items-center gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="검색"
              className="border border-gray-300 rounded-full pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang("KOR")}
              className={`text-sm ${
                lang === "KOR" ? "font-bold text-blue-600" : "text-gray-600"
              }`}
            >
              KOR
            </button>
            <span className="text-gray-400">|</span>
            <button
              onClick={() => setLang("ENG")}
              className={`text-sm ${
                lang === "ENG" ? "font-bold text-blue-600" : "text-gray-600"
              }`}
            >
              ENG
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
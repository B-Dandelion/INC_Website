// components/Header.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Search } from "lucide-react";

export default function Header() {
  const [lang, setLang] = useState<"KOR" | "ENG">("KOR");

  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
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

        <nav className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-sm font-medium text-gray-700">
          <Link href="/about" className="hover:text-blue-600">
            INC 소개
          </Link>
          <Link href="/committee" className="hover:text-blue-600">
            자문위원회
          </Link>
          <Link href="/people" className="hover:text-blue-600">
            연구진
          </Link>
          <Link href="/partners" className="hover:text-blue-600">
            협력기관
          </Link>
          <Link href="/global" className="hover:text-blue-600">
            국제교류
          </Link>
          <Link href="/resources" className="hover:text-blue-600">
            자료실
          </Link>
          <Link href="/news" className="hover:text-blue-600">
            공지사항
          </Link>
          <Link href="/forum" className="hover:text-blue-600">
            참여마당
          </Link>
        </nav>

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

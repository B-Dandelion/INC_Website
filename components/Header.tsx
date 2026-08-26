"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, Search, X } from "lucide-react";
import AuthButton from "@/components/AuthButton";
import LanguageToggle from "@/components/LanguageToggle";
import { RESOURCE_BOARDS } from "@/lib/resourceBoards";
import type { Locale } from "@/lib/i18n";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import ResourcesMegaMenu from "@/components/header/ResourcesMegaMenu";

export default function Header({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const en = locale === "en";

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const resourceLinks = useMemo(
    () =>
      RESOURCE_BOARDS.map((b) => ({
        label: en ? b.labelEn : b.label,
        href: `/resources/${b.slug}`,
      })),
    [en],
  );

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-6 px-5 md:px-6">
        <Link href="/" className="flex shrink-0 items-center" aria-label={en ? "INC home" : "INC 홈"}>
          <Image src="/inc_logo.png" alt="INC Logo" width={148} height={56} priority />
        </Link>

        <div className="hidden min-w-0 flex-1 items-center justify-end gap-7 md:flex">
          <nav className="flex items-center gap-6 text-[14px] font-semibold text-slate-700">
            <ResourcesMegaMenu key={`${pathname}-${locale}`} locale={locale} />
            <Link
              href="/notice"
              className={`transition-colors hover:text-[#174A7E] ${pathname.startsWith("/notice") ? "text-[#174A7E]" : ""}`}
            >
              {en ? "Notices" : "공지사항"}
            </Link>
            <Link
              href="/events"
              className={`transition-colors hover:text-[#174A7E] ${pathname.startsWith("/events") ? "text-[#174A7E]" : ""}`}
            >
              {en ? "Events" : "행사·이벤트"}
            </Link>
          </nav>

          <form action="/search" method="get" className="relative w-[230px]" role="search">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              name="q"
              type="search"
              aria-label={en ? "Site search" : "사이트 검색"}
              placeholder={en ? "Search site" : "사이트 검색"}
              className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-[#2B6CA3] focus:ring-2 focus:ring-[#2B6CA3]/10"
            />
          </form>

          <div className="flex items-center gap-4 border-l border-slate-200 pl-5">
            <LanguageToggle locale={locale} />
            <AuthButton locale={locale} />
          </div>
        </div>

        <div className="flex items-center gap-3 md:hidden">
          <LanguageToggle locale={locale} />
          <AuthButton locale={locale} />
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700"
            aria-label={mobileOpen ? (en ? "Close menu" : "메뉴 닫기") : en ? "Open menu" : "메뉴 열기"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <div className="mx-auto max-w-7xl px-5 py-5">
            <div className="grid gap-1">
              <Link href="/resources" className="border-b border-slate-100 py-3 text-sm font-semibold text-slate-900">
                {en ? "All Resources" : "자료실 전체 보기"}
              </Link>
              <Link href="/notice" className="border-b border-slate-100 py-3 text-sm font-semibold text-slate-900">
                {en ? "Notices" : "공지사항"}
              </Link>
              <Link href="/events" className="border-b border-slate-100 py-3 text-sm font-semibold text-slate-900">
                {en ? "Events" : "행사·이벤트"}
              </Link>
            </div>

            <div className="mt-5">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Categories</div>
              <div className="grid grid-cols-2 gap-x-5">
                {resourceLinks.map((x) => (
                  <Link key={x.href} href={x.href} className="border-b border-slate-100 py-2.5 text-sm text-slate-600">
                    {x.label}
                  </Link>
                ))}
              </div>
            </div>

            <form action="/search" method="get" className="relative mt-5" role="search">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                name="q"
                type="search"
                aria-label={en ? "Site search" : "사이트 검색"}
                placeholder={en ? "Search resources, notices, events" : "자료·공지·이벤트 검색"}
                className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none"
              />
            </form>
          </div>
        </div>
      ) : null}
    </header>
  );
}

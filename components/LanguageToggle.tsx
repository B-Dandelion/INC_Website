"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";

export default function LanguageToggle({ locale }: { locale: Locale }) {
  const router = useRouter();

  function setLocale(next: Locale) {
    if (next === locale) return;
    document.cookie = `inc_lang=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    document.documentElement.lang = next === "en" ? "en" : "ko";
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 text-xs font-semibold tracking-wide" aria-label="Language">
      <button
        type="button"
        onClick={() => setLocale("ko")}
        className={locale === "ko" ? "text-[#174A7E]" : "text-slate-400 transition hover:text-slate-600"}
        aria-pressed={locale === "ko"}
      >
        KOR
      </button>
      <span className="text-slate-300">/</span>
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={locale === "en" ? "text-[#174A7E]" : "text-slate-400 transition hover:text-slate-600"}
        aria-pressed={locale === "en"}
      >
        ENG
      </button>
    </div>
  );
}

import { cookies } from "next/headers";

export type Locale = "ko" | "en";

// Public UI locale is persisted in a cookie so navigation and refreshes keep the selected language.
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return store.get("inc_lang")?.value === "en" ? "en" : "ko";
}

export function pick<T>(locale: Locale, ko: T, en: T): T {
  return locale === "en" ? en : ko;
}

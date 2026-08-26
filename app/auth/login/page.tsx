import { Suspense } from "react";
import LoginClient from "./LoginClient";
import { getLocale } from "@/lib/i18n";

export default async function LoginPage() {
  const locale = await getLocale();
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>{locale === "en" ? "Loading…" : "불러오는 중…"}</div>}>
      <LoginClient locale={locale} />
    </Suspense>
  );
}

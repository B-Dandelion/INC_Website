import { Suspense } from "react";
import SignupClient from "./SignupClient";
import { getLocale } from "@/lib/i18n";

export default async function SignupPage() {
  const locale = await getLocale();
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>{locale === "en" ? "Loading…" : "불러오는 중…"}</div>}>
      <SignupClient locale={locale} />
    </Suspense>
  );
}

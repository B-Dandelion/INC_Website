import { getLocale } from "@/lib/i18n";
import PendingClient from "./PendingClient";

export default async function PendingPage() {
  const locale = await getLocale();
  return <PendingClient locale={locale} />;
}

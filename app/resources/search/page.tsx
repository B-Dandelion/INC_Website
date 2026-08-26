import { redirect } from "next/navigation";

export default async function LegacyResourceSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  redirect(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
}

import Link from "next/link";
import { BarChart3, ChevronLeft, LogOut } from "lucide-react";
import AdminAnalyticsDashboard, { type AnalyticsDashboardData } from "@/components/admin/AdminAnalyticsDashboard";
import { siteAnalyticsAdmin } from "@/lib/siteAnalyticsServer";

export const dynamic = "force-dynamic";

const ranges = [
  { key: "7d", label: "7일", days: 7 },
  { key: "30d", label: "30일", days: 30 },
  { key: "90d", label: "90일", days: 90 },
  { key: "all", label: "전체", days: null },
] as const;

type RangeKey = (typeof ranges)[number]["key"];

function resolveRange(value: string | string[] | undefined): RangeKey {
  const raw = Array.isArray(value) ? value[0] : value;
  return ranges.some((item) => item.key === raw) ? (raw as RangeKey) : "7d";
}

function sinceFor(range: RangeKey, now: Date) {
  if (range === "all") return new Date("2025-11-01T00:00:00+09:00");
  const days = ranges.find((item) => item.key === range)?.days ?? 7;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

const emptyData: AnalyticsDashboardData = {
  summary: { pageviews: 0, visitors: 0, downloads: 0, searches: 0, logins: 0, signups: 0, newMembers: 0 },
  daily: [],
  topPaths: [],
  devices: [],
  referrers: [],
  downloadCategories: [],
  topResources: [],
  topSearches: [],
  recent: [],
};

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const range = resolveRange(params.range);
  const now = new Date();
  const since = sinceFor(range, now);
  const supabase = siteAnalyticsAdmin();

  const [dashboardResult, membersResult, resourcesResult] = await Promise.all([
    supabase.rpc("get_site_analytics_dashboard", {
      p_since: since.toISOString(),
      p_until: now.toISOString(),
    }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "member").eq("approved", true),
    supabase.from("resources").select("id", { count: "exact", head: true }).eq("visibility", "public").is("deleted_at", null),
  ]);

  if (dashboardResult.error) {
    console.error("[admin-analytics] dashboard rpc failed", dashboardResult.error.message);
  }

  const data = (dashboardResult.data ?? emptyData) as AnalyticsDashboardData;
  const activeMembers = membersResult.count ?? 0;
  const totalResources = resourcesResult.count ?? 0;

  return (
    <main className="min-h-screen bg-[#F6F7F9]">
      <div className="mx-auto w-full max-w-[1440px] px-5 py-10 md:px-7 md:py-12">
        <section className="border-b border-slate-300 pb-6">
          <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#2B6CA3]">
                <BarChart3 className="h-4 w-4" /> INC Administration
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-slate-950">웹 이용 분석</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">방문, 검색, 자료 이용과 회원 활동을 실제 익명 통계로 확인합니다.</p>
              <p className="mt-1 text-xs text-slate-400">{formatDate(since)} ~ {formatDate(now)} · KST</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link href="/admin-x7k3p9/resources" className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                <ChevronLeft className="h-4 w-4" /> 콘텐츠 관리
              </Link>
              <form action="/api/admin/logout" method="post">
                <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"><LogOut className="h-4 w-4" /> 로그아웃</button>
              </form>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {ranges.map((item) => (
              <Link
                key={item.key}
                href={`/admin-x7k3p9/analytics?range=${item.key}`}
                className={`inline-flex h-9 min-w-[58px] items-center justify-center rounded-md border px-3 text-sm font-semibold transition ${
                  range === item.key
                    ? "border-[#174A7E] bg-[#174A7E] text-white"
                    : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-7">
          {dashboardResult.error ? (
            <div className="mb-5 border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">통계 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</div>
          ) : null}
          <AdminAnalyticsDashboard data={data} activeMembers={activeMembers} totalResources={totalResources} />
        </section>
      </div>
    </main>
  );
}

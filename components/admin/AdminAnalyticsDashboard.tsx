"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, Eye, FileText, Search, UserPlus, UsersRound } from "lucide-react";

const COLORS = ["#174A7E", "#2B6CA3", "#0F766E", "#B45309", "#7C3AED", "#64748B", "#0E7490", "#BE123C"];

export type AnalyticsDashboardData = {
  summary: {
    pageviews: number;
    visitors: number;
    downloads: number;
    searches: number;
    logins: number;
    signups: number;
    newMembers: number;
  };
  daily: Array<{ day: string; pageviews: number; visitors: number; downloads: number; searches: number; logins: number; signups: number }>;
  topPaths: Array<{ path: string; pageviews: number; visitors: number }>;
  devices: Array<{ name: string; value: number }>;
  referrers: Array<{ name: string; value: number }>;
  downloadCategories: Array<{ name: string; value: number }>;
  topResources: Array<{ id: number; title: string; board: string; downloads: number }>;
  topSearches: Array<{ query: string; searches: number }>;
  recent: Array<{ id: number; event_type: string; time: string; path: string | null; search_query: string | null; device_type: string; resource_title: string | null }>;
};

function n(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function EmptyChart({ text = "아직 집계된 데이터가 없습니다." }: { text?: string }) {
  return <div className="flex h-full items-center justify-center text-sm text-slate-400">{text}</div>;
}

const tooltipStyle = {
  border: "1px solid #dbe3ec",
  borderRadius: 8,
  boxShadow: "0 10px 30px rgba(15,23,42,.08)",
  fontSize: 12,
};

function eventLabel(type: string) {
  return ({ page_view: "페이지 방문", download: "자료 이용", search: "검색", login: "로그인", signup: "회원가입" } as Record<string, string>)[type] ?? type;
}

function deviceLabel(name: string) {
  return ({ desktop: "데스크톱", tablet: "태블릿", mobile: "모바일", unknown: "기타" } as Record<string, string>)[name] ?? name;
}

export default function AdminAnalyticsDashboard({
  data,
  activeMembers,
  totalResources,
}: {
  data: AnalyticsDashboardData;
  activeMembers: number;
  totalResources: number;
}) {
  const summary = data.summary ?? { pageviews: 0, visitors: 0, downloads: 0, searches: 0, logins: 0, signups: 0, newMembers: 0 };
  const deviceData = (data.devices ?? []).map((item) => ({ ...item, name: deviceLabel(item.name), value: n(item.value) }));

  const kpis = [
    { label: "순 방문자", value: n(summary.visitors), icon: UsersRound, note: "익명 방문자 기준" },
    { label: "페이지뷰", value: n(summary.pageviews), icon: Eye, note: "선택 기간 전체" },
    { label: "자료 이용", value: n(summary.downloads), icon: Download, note: "자료 열기·다운로드" },
    { label: "검색", value: n(summary.searches), icon: Search, note: "통합 검색 실행" },
    { label: "신규 회원", value: n(summary.newMembers), icon: UserPlus, note: "DB 가입일 기준" },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map(({ label, value, icon: Icon, note }) => (
          <article key={label} className="relative overflow-hidden border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#174A7E] via-[#2B6CA3] to-[#0F766E]" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-500">{label}</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{value.toLocaleString("ko-KR")}</p>
                <p className="mt-1 text-[11px] text-slate-400">{note}</p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#EEF4FA] text-[#174A7E]"><Icon className="h-4 w-4" /></span>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.8fr_1fr]">
        <article className="border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div><h2 className="text-base font-semibold text-slate-900">방문 추이</h2><p className="mt-1 text-xs text-slate-400">일별 페이지뷰와 순 방문자</p></div>
            <div className="text-xs text-slate-400">KST</div>
          </div>
          <div className="h-[320px]">
            {data.daily?.some((d) => n(d.pageviews) > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.daily} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                  <defs>
                    <linearGradient id="trafficLine" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#174A7E" /><stop offset="100%" stopColor="#2B6CA3" /></linearGradient>
                  </defs>
                  <CartesianGrid stroke="#E8EDF3" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tickFormatter={(v) => String(v).slice(5)} tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} minTickGap={18} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                  <Line type="monotone" dataKey="pageviews" name="페이지뷰" stroke="url(#trafficLine)" strokeWidth={3} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="visitors" name="순 방문자" stroke="#0F766E" strokeWidth={2.3} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </article>

        <article className="border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div><h2 className="text-base font-semibold text-slate-900">접속 기기</h2><p className="mt-1 text-xs text-slate-400">페이지뷰 기준 기기 비중</p></div>
          <div className="h-[320px]">
            {deviceData.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={deviceData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={98} paddingAngle={3}>
                    {deviceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div><h2 className="text-base font-semibold text-slate-900">많이 본 페이지</h2><p className="mt-1 text-xs text-slate-400">페이지뷰 상위 10개 경로</p></div>
          <div className="mt-4 h-[330px]">
            {data.topPaths?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topPaths} layout="vertical" margin={{ top: 0, right: 18, bottom: 0, left: 24 }}>
                  <CartesianGrid stroke="#E8EDF3" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="path" width={140} tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="pageviews" name="페이지뷰" fill="#174A7E" radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </article>

        <article className="border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div><h2 className="text-base font-semibold text-slate-900">자료실 이용 분포</h2><p className="mt-1 text-xs text-slate-400">카테고리별 자료 열기·다운로드</p></div>
          <div className="mt-4 h-[330px]">
            {data.downloadCategories?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.downloadCategories} margin={{ top: 10, right: 12, left: -16, bottom: 26 }}>
                  <CartesianGrid stroke="#E8EDF3" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" angle={-18} textAnchor="end" interval={0} tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" name="자료 이용" radius={[6, 6, 0, 0]}>{data.downloadCategories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <article className="border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div><h2 className="text-base font-semibold text-slate-900">유입 경로</h2><p className="mt-1 text-xs text-slate-400">세션 첫 방문 기준 상위 유입 도메인</p></div>
          <div className="mt-4 h-[300px]">
            {data.referrers?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.referrers} layout="vertical" margin={{ right: 16, left: 24 }}>
                  <CartesianGrid stroke="#E8EDF3" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={135} tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" name="세션" fill="#2B6CA3" radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </article>

        <article className="border border-slate-200 bg-gradient-to-br from-[#0F2F4F] via-[#174A7E] to-[#2B6CA3] p-5 text-white shadow-[0_12px_34px_rgba(23,74,126,0.16)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">Current system</p>
          <h2 className="mt-2 text-lg font-semibold">현재 서비스 규모</h2>
          <div className="mt-7 grid grid-cols-2 gap-3">
            <div className="border border-white/15 bg-white/10 p-4"><UsersRound className="h-5 w-5 text-white/70" /><div className="mt-5 text-3xl font-semibold">{activeMembers.toLocaleString("ko-KR")}</div><div className="mt-1 text-xs text-white/65">승인 회원</div></div>
            <div className="border border-white/15 bg-white/10 p-4"><FileText className="h-5 w-5 text-white/70" /><div className="mt-5 text-3xl font-semibold">{totalResources.toLocaleString("ko-KR")}</div><div className="mt-1 text-xs text-white/65">공개 자료</div></div>
          </div>
          <div className="mt-4 border-t border-white/15 pt-4 text-xs leading-5 text-white/60">방문·검색·자료 이용 통계는 이 기능이 배포된 시점부터 누적됩니다.</div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="overflow-hidden border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-200 px-5 py-4"><h2 className="text-base font-semibold text-slate-900">인기 자료</h2><p className="mt-1 text-xs text-slate-400">선택 기간 자료 이용 상위 10개</p></div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500"><tr><th className="px-5 py-3">자료</th><th className="px-4 py-3">카테고리</th><th className="px-4 py-3 text-right">이용</th></tr></thead><tbody className="divide-y divide-slate-100">
              {data.topResources?.length ? data.topResources.map((r) => <tr key={r.id}><td className="max-w-[340px] truncate px-5 py-3 font-medium text-slate-800">{r.title}</td><td className="px-4 py-3 text-slate-500">{r.board}</td><td className="px-4 py-3 text-right font-semibold text-[#174A7E]">{n(r.downloads).toLocaleString("ko-KR")}</td></tr>) : <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-400">아직 자료 이용 기록이 없습니다.</td></tr>}
            </tbody></table>
          </div>
        </article>

        <article className="overflow-hidden border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-200 px-5 py-4"><h2 className="text-base font-semibold text-slate-900">인기 검색어</h2><p className="mt-1 text-xs text-slate-400">선택 기간 통합검색 상위 10개</p></div>
          <div className="grid divide-y divide-slate-100">
            {data.topSearches?.length ? data.topSearches.map((row, i) => <div key={`${row.query}-${i}`} className="flex items-center justify-between gap-4 px-5 py-3"><div className="flex min-w-0 items-center gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EEF4FA] text-xs font-bold text-[#174A7E]">{i + 1}</span><span className="truncate text-sm font-medium text-slate-800">{row.query}</span></div><span className="text-sm font-semibold text-slate-500">{n(row.searches).toLocaleString("ko-KR")}</span></div>) : <div className="px-5 py-8 text-center text-sm text-slate-400">아직 검색 기록이 없습니다.</div>}
          </div>
        </article>
      </section>

      <section className="overflow-hidden border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="text-base font-semibold text-slate-900">최근 활동</h2><p className="mt-1 text-xs text-slate-400">개인정보를 표시하지 않는 익명 이벤트 로그</p></div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500"><tr><th className="px-5 py-3">시간</th><th className="px-4 py-3">동작</th><th className="px-4 py-3">내용</th><th className="px-4 py-3">기기</th></tr></thead><tbody className="divide-y divide-slate-100">
            {data.recent?.length ? data.recent.map((r) => {
              const detail = r.resource_title ?? r.search_query ?? r.path ?? "-";
              return <tr key={r.id}><td className="whitespace-nowrap px-5 py-3 text-slate-500">{r.time}</td><td className="px-4 py-3 font-medium text-slate-800">{eventLabel(r.event_type)}</td><td className="max-w-[520px] truncate px-4 py-3 text-slate-600">{detail}</td><td className="px-4 py-3 text-slate-500">{deviceLabel(r.device_type)}</td></tr>;
            }) : <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400">아직 기록된 활동이 없습니다.</td></tr>}
          </tbody></table>
        </div>
      </section>
    </div>
  );
}

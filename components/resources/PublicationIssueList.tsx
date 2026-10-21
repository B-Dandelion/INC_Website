// components/resources/PublicationIssueList.tsx
// Issue list of a serial publication (ATM, Heartbeat of Atoms) as cards that show
// what is inside each issue, grouped by month or year, with numbered pages.
import Link from "next/link";
import { ArrowRight, CalendarDays, FileText, Newspaper, BookOpen } from "lucide-react";
import styles from "./SimpleListPage.module.css";
import ResourcesFrame from "./ResourcesFrame";
import Pager from "./Pager";
import { getLocale } from "@/lib/i18n";
import { countResources, fetchResources } from "@/lib/resourcesDb";
import { PUBLICATIONS, cut, issueLabel, issuePath, readIssueContent, type IssueContent, type PublicationSlug } from "@/lib/publications";

const PAGE_SIZE = 24;
const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];
const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayLabel(ymd: string | null, en: boolean) {
  if (!ymd) return "";
  const d = new Date(`${ymd}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return ymd;
  return `${ymd.replace(/-/g, ".")} (${(en ? WEEKDAYS_EN : WEEKDAYS_KO)[d.getUTCDay()]})`;
}

function groupKey(slug: PublicationSlug, ymd: string | null, en: boolean) {
  if (!ymd) return en ? "Undated" : "날짜 없음";
  const [y, m] = ymd.split("-");
  if (slug === "heartbeat-of-atoms") return en ? y : `${y}년`;
  return en ? `${y}.${m}` : `${y}년 ${Number(m)}월`;
}

type Row = { id: number; title: string | null; published_at: string | null; r2_key: string | null };

export default async function PublicationIssueList({
  slug,
  page,
  publishedFrom,
  publishedTo,
  filter,
  makePageHref,
}: {
  slug: PublicationSlug;
  page: number;
  publishedFrom?: string;
  publishedTo?: string;
  filter: React.ReactNode;
  makePageHref: (p: number) => string;
}) {
  const locale = await getLocale();
  const en = locale === "en";
  const pub = PUBLICATIONS[slug];
  const args = { boardSlug: slug, page, pageSize: PAGE_SIZE, publishedFrom, publishedTo };
  const [rows, total, firstRows] = await Promise.all([
    fetchResources(args),
    countResources(args),
    // Oldest issue, for the "since" figure in the header.
    fetchResources({ boardSlug: slug, page: 1, pageSize: 10, publishedFrom: "1900-01-01" }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const contents = await Promise.all(
    (rows as Row[]).map((r) => (r.r2_key ? readIssueContent(slug, r.r2_key) : Promise.resolve<IssueContent>({ kind: "none" }))),
  );
  const items = (rows as Row[]).map((r, i) => ({ row: r, content: contents[i] }));
  const filtered = Boolean(publishedFrom || publishedTo);
  const spotlight = !filtered && page === 1 ? items[0] : null;
  const rest = spotlight ? items.slice(1) : items;

  const groups: { key: string; items: typeof items }[] = [];
  for (const it of rest) {
    const key = groupKey(slug, it.row.published_at, en);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(it);
    else groups.push({ key, items: [it] });
  }

  const since = (firstRows as Row[])[0]?.published_at?.slice(0, 7).replace("-", ".");
  const Icon = slug === "atm" ? Newspaper : BookOpen;

  return (
    <ResourcesFrame activeKey={slug}>
      <div className={styles.content}>
        <header className="mb-8">
          <nav aria-label={en ? "Breadcrumb" : "위치"} className="text-[13px] font-semibold text-slate-600">
            <Link href="/resources" className="hover:text-[#174A7E]">
              {en ? "Resources" : "자료실"}
            </Link>
            <span className="mx-1.5" aria-hidden="true">
              /
            </span>
            <span>{en ? "Publications" : "정기 간행물"}</span>
          </nav>
          <div className="mt-4 flex items-start gap-4">
            <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#174A7E] text-white sm:flex" aria-hidden="true">
              <Icon className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h1 className="text-[32px] font-bold leading-tight tracking-[-0.03em] text-slate-950">{pub.name}</h1>
              <p className="mt-1 text-[15px] text-slate-600">{en ? pub.tagline : pub.taglineKo}</p>
            </div>
          </div>
          <dl className="mt-5 flex flex-wrap gap-2 text-[13px]">
            <div className="rounded-full bg-white px-3 py-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-slate-200">
              <dt className="sr-only">{en ? "Issues" : "발행 호수"}</dt>
              <dd className="font-semibold text-slate-800">{en ? `${total} issues` : `총 ${total.toLocaleString()}호`}</dd>
            </div>
            {since ? (
              <div className="rounded-full bg-white px-3 py-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-slate-200">
                <dt className="sr-only">{en ? "Since" : "발행 시작"}</dt>
                <dd className="font-semibold text-slate-800">{en ? `Since ${since}` : `${since}부터 발행`}</dd>
              </div>
            ) : null}
            <div className="rounded-full bg-white px-3 py-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-slate-200">
              <dt className="sr-only">{en ? "Frequency" : "발행 주기"}</dt>
              <dd className="font-semibold text-slate-800">{slug === "atm" ? (en ? "Every weekday" : "평일 매일") : en ? "Every two weeks" : "격주"}</dd>
            </div>
          </dl>
          <div className="mt-6">{filter}</div>
        </header>

        {spotlight ? <Spotlight slug={slug} item={spotlight} en={en} /> : null}

        {items.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-600">
            {en ? "No issues match this date." : "이 날짜 조건에 맞는 호가 없습니다."}
          </div>
        ) : null}

        {groups.map((group) => (
          <section key={group.key} className="mt-10" aria-labelledby={`g-${group.key}`}>
            <h2 id={`g-${group.key}`} className="mb-4 flex items-center gap-2 text-[15px] font-bold text-slate-800">
              <CalendarDays className="h-4 w-4 text-[#2B6CA3]" aria-hidden="true" />
              {group.key}
              <span className="text-[13px] font-medium text-slate-600">{group.items.length}</span>
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {group.items.map((it) => (
                <IssueCard key={it.row.id} slug={slug} item={it} en={en} />
              ))}
            </div>
          </section>
        ))}

        <Pager page={Math.min(page, pageCount)} pageCount={pageCount} href={makePageHref} en={en} />
      </div>
    </ResourcesFrame>
  );
}

type Item = { row: Row; content: IssueContent };

function Spotlight({ slug, item, en }: { slug: PublicationSlug; item: Item; en: boolean }) {
  const { row, content } = item;
  const label = issueLabel(row.title);
  return (
    <Link
      href={issuePath(slug, row.id)}
      className="group block overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f2f52] to-[#174A7E] p-6 text-white shadow-[0_12px_32px_rgba(23,74,126,0.25)] md:p-8"
    >
      <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-white/80">
        <span className="rounded-full bg-white/15 px-2.5 py-1 text-white">{en ? "Latest issue" : "최신호"}</span>
        {label ? <span>{label}</span> : null}
        <span>{dayLabel(row.published_at, en)}</span>
      </div>
      {content.kind === "atm" && content.atm.items.length ? (
        <ol className="mt-5 grid gap-4">
          {content.atm.items.map((it, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-bold">{i + 1}</span>
              <div className="min-w-0">
                <p className="text-[17px] font-semibold leading-7 text-white">{it.title}</p>
                {it.bullets[0] ? <p className="mt-1 line-clamp-2 text-[14px] leading-6 text-white/80">{it.bullets[0]}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      ) : content.kind === "heartbeat" && content.heartbeat.column ? (
        <div className="mt-5">
          <p className="text-[13px] font-semibold text-white/70">{en ? "Column" : "이번 호 칼럼"}</p>
          <p className="mt-1 text-[24px] font-bold leading-8 text-white">{content.heartbeat.column.title ?? content.heartbeat.column.heading}</p>
          {content.heartbeat.column.paragraphs[0] ? (
            <p className="mt-3 line-clamp-3 max-w-3xl text-[14px] leading-7 text-white/80">{cut(content.heartbeat.column.paragraphs[0], 260)}</p>
          ) : null}
        </div>
      ) : (
        <p className="mt-5 text-[20px] font-bold text-white">{row.title}</p>
      )}
      <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-white">
        {en ? "Read this issue" : "이번 호 읽기"}
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  );
}

function IssueCard({ slug, item, en }: { slug: PublicationSlug; item: Item; en: boolean }) {
  const { row, content } = item;
  const label = issueLabel(row.title);
  return (
    <Link
      href={issuePath(slug, row.id)}
      className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-[#9BB9D6] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
    >
      <div className="flex items-center justify-between gap-2 text-[12px] font-semibold">
        <span className="rounded-full bg-[#EEF4FA] px-2.5 py-1 text-[#174A7E]">{label || (en ? "Issue" : "호")}</span>
        <span className="text-slate-600">
          {content.kind === "heartbeat" && content.heartbeat.period ? content.heartbeat.period : dayLabel(row.published_at, en)}
        </span>
      </div>

      {content.kind === "atm" && content.atm.items.length ? (
        <>
          <p className="mt-3 line-clamp-2 text-[16px] font-semibold leading-6 text-slate-950 group-hover:text-[#174A7E]">{content.atm.items[0].title}</p>
          {content.atm.items.length > 1 ? (
            <ul className="mt-3 grid gap-1.5 border-t border-slate-100 pt-3 text-[13px] leading-5 text-slate-600">
              {content.atm.items.slice(1).map((it, i) => (
                <li key={i} className="line-clamp-1">
                  · {it.title}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : content.kind === "heartbeat" && (content.heartbeat.column || content.heartbeat.toc.length) ? (
        <>
          {content.heartbeat.column ? (
            <p className="mt-3 line-clamp-2 text-[16px] font-semibold leading-6 text-slate-950 group-hover:text-[#174A7E]">
              {content.heartbeat.column.title ? `“${content.heartbeat.column.title}”` : content.heartbeat.column.heading}
            </p>
          ) : (
            <p className="mt-3 line-clamp-2 text-[16px] font-semibold leading-6 text-slate-950 group-hover:text-[#174A7E]">{row.title}</p>
          )}
          {content.heartbeat.toc.length ? (
            <p className="mt-3 border-t border-slate-100 pt-3 text-[13px] leading-5 text-slate-600">
              {en
                ? `${content.heartbeat.toc.length} sections`
                : `${content.heartbeat.toc.length}개 분야${
                    content.heartbeat.toc.some((s) => s.items.length) ? ` · 기사 ${content.heartbeat.toc.reduce((n, s) => n + s.items.length, 0)}건` : ""
                  }`}
            </p>
          ) : null}
        </>
      ) : (
        <p className="mt-3 flex items-start gap-2 text-[15px] font-semibold leading-6 text-slate-900">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
          {row.title}
        </p>
      )}
    </Link>
  );
}

// components/home/PublicationHighlights.tsx
// Home page lead section: the newest ATM (today's three stories) next to the
// newest Heartbeat of Atoms (column and sections), so visitors meet the
// content itself instead of a list of category buttons.
import Link from "next/link";
import { ArrowRight, Newspaper, BookOpen } from "lucide-react";
import { PUBLICATIONS, cut, issueNumber, issuePath, type fetchLatestIssue } from "@/lib/publications";

type Latest = Awaited<ReturnType<typeof fetchLatestIssue>>;

export default function PublicationHighlights({ atm, heartbeat, en }: { atm: Latest; heartbeat: Latest; en: boolean }) {
  if (!atm && !heartbeat) return null;
  return (
    <section aria-labelledby="home-publications">
      <div className="flex items-end justify-between gap-4 border-b border-slate-300 pb-4">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#2B6CA3]">Publications</p>
          <h2 id="home-publications" className="mt-1 text-[26px] font-semibold tracking-[-0.025em] text-slate-950">
            {en ? "Nuclear Industry Briefings" : "원자력 동향 브리핑"}
          </h2>
        </div>
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        {atm ? <AtmCard latest={atm} en={en} /> : null}
        {heartbeat ? <HeartbeatCard latest={heartbeat} en={en} /> : null}
      </div>
    </section>
  );
}

function CardHeader({ icon, name, meta }: { icon: React.ReactNode; name: string; meta: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#EEF4FA] text-[#174A7E]" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[15px] font-bold text-slate-950">{name}</p>
        <p className="truncate text-[12px] font-medium text-slate-600">{meta}</p>
      </div>
    </div>
  );
}

function CardFooter({ readHref, listHref, readLabel, en }: { readHref: string; listHref: string; readLabel: string; en: boolean }) {
  return (
    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
      <Link href={readHref} className="inline-flex items-center gap-1.5 text-sm font-bold text-[#174A7E] hover:underline">
        {readLabel}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
      <Link href={listHref} className="text-[13px] font-semibold text-slate-600 hover:text-[#174A7E]">
        {en ? "All issues" : "지난 호 전체"}
      </Link>
    </div>
  );
}

function AtmCard({ latest, en }: { latest: NonNullable<Latest>; en: boolean }) {
  const { issue, content } = latest;
  const no = issueNumber(issue.title);
  const items = content.kind === "atm" ? content.atm.items : [];
  const meta = [issue.published_at, no ? `No. ${no}` : null, en ? "Daily nuclear news, 3 stories" : PUBLICATIONS.atm.taglineKo].filter(Boolean).join(" · ");
  return (
    <article className="flex min-w-0 flex-col gap-5 border border-slate-200 bg-white p-6">
      <CardHeader icon={<Newspaper className="h-4 w-4" />} name="ATM" meta={meta} />
      {items.length ? (
        <ol className="grid gap-4">
          {items.map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700" aria-hidden="true">
                {i + 1}
              </span>
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold leading-6 text-slate-900">{item.title}</h3>
                {item.bullets[0] ? <p className="mt-1 line-clamp-2 text-[13px] leading-6 text-slate-600">{item.bullets[0]}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-[15px] font-semibold text-slate-900">{issue.title}</p>
      )}
      <CardFooter readHref={issuePath("atm", issue.id)} listHref="/resources/atm" readLabel={en ? "Read this issue" : "이번 호 읽기"} en={en} />
    </article>
  );
}

function HeartbeatCard({ latest, en }: { latest: NonNullable<Latest>; en: boolean }) {
  const { issue, content } = latest;
  const no = issueNumber(issue.title);
  const hb = content.kind === "heartbeat" ? content.heartbeat : null;
  const meta = [no ? `No. ${no}` : null, hb?.period ?? issue.published_at, en ? "Biweekly report" : "격주 리포트"].filter(Boolean).join(" · ");
  return (
    <article className="flex min-w-0 flex-col gap-5 border border-slate-200 bg-white p-6">
      <CardHeader icon={<BookOpen className="h-4 w-4" />} name="Heartbeat of Atoms" meta={meta} />
      {hb?.column ? (
        <div>
          <p className="text-[12px] font-bold text-[#2B6CA3]">{en ? "Column" : "이번 호 칼럼"}</p>
          <h3 className="mt-1 text-[18px] font-semibold leading-7 tracking-[-0.01em] text-slate-950">{hb.column.title ?? hb.column.heading}</h3>
          {hb.column.paragraphs[0] ? <p className="mt-2 line-clamp-3 text-[13px] leading-6 text-slate-600">{cut(hb.column.paragraphs[0], 220)}</p> : null}
        </div>
      ) : (
        <p className="text-[15px] font-semibold text-slate-900">{issue.title}</p>
      )}
      {hb?.toc.length ? (
        <div>
          <p className="text-[12px] font-bold text-slate-700">{en ? "Sections" : "다루는 분야"}</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {hb.toc.map((s, i) => (
              <li key={i} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[12px] font-medium text-slate-700">
                {cut(s.title, 22)}
                {s.items.length ? <span className="ml-1 text-slate-500">{s.items.length}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <CardFooter
        readHref={issuePath("heartbeat-of-atoms", issue.id)}
        listHref="/resources/heartbeat-of-atoms"
        readLabel={en ? "Read the column" : "칼럼과 목차 보기"}
        en={en}
      />
    </article>
  );
}

// components/resources/PublicationIssuePage.tsx
// One issue of ATM or Heartbeat of Atoms as a readable, indexable web page,
// with the original PDF one click away.
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, ExternalLink, FileText } from "lucide-react";
import styles from "./SimpleListPage.module.css";
import ResourcesFrame from "./ResourcesFrame";
import ViewBeacon from "./ViewBeacon";
import { getLocale } from "@/lib/i18n";
import { absoluteUrl, makeMetadata, SITE_NAME } from "@/lib/seo";
import {
  PUBLICATIONS,
  cut,
  fetchIssue,
  issueLabel,
  issuePath,
  issueSummary,
  readIssueContent,
  type IssueContent,
  type PublicationSlug,
} from "@/lib/publications";

function parseId(id: string) {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function load(slug: PublicationSlug, idParam: string) {
  const id = parseId(idParam);
  if (!id) return null;
  const found = await fetchIssue(slug, id);
  if (!found) return null;
  const content: IssueContent = found.issue.r2_key ? await readIssueContent(slug, found.issue.r2_key) : { kind: "none" };
  return { ...found, content };
}

export async function publicationIssueMetadata(slug: PublicationSlug, idParam: string): Promise<Metadata> {
  const data = await load(slug, idParam);
  if (!data) return { title: PUBLICATIONS[slug].name };
  const pub = PUBLICATIONS[slug];
  const title = data.issue.title ?? pub.name;
  const description = cut(issueSummary(data.content, `${pub.name} — ${pub.taglineKo}`), 160);
  const base = makeMetadata({ title, description, path: issuePath(slug, data.issue.id), type: "article" });
  return {
    ...base,
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      siteName: SITE_NAME,
      locale: "ko_KR",
      type: "article",
      url: absoluteUrl(issuePath(slug, data.issue.id)),
      publishedTime: data.issue.published_at ?? undefined,
    },
    twitter: { ...base.twitter, card: "summary_large_image" },
  };
}

export default async function PublicationIssuePage({ slug, idParam }: { slug: PublicationSlug; idParam: string }) {
  const data = await load(slug, idParam);
  if (!data) notFound();
  const locale = await getLocale();
  const en = locale === "en";
  const pub = PUBLICATIONS[slug];
  const { issue, older, newer, content } = data;
  // The page view is what counts; opening the PDF from here is recorded as a download only.
  const pdfHref = `/api/resources/media?id=${issue.id}&dl=1`;
  const listHref = `/resources/${slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: issue.title ?? pub.name,
    datePublished: issue.published_at ?? undefined,
    description: cut(issueSummary(content, pub.taglineKo), 300),
    isPartOf: { "@type": "Periodical", name: pub.name },
    publisher: { "@type": "Organization", name: SITE_NAME },
    mainEntityOfPage: absoluteUrl(issuePath(slug, issue.id)),
    inLanguage: "ko",
  };

  return (
    <ResourcesFrame activeKey={slug}>
      <article className={styles.content}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <ViewBeacon id={issue.id} />
        <header className={styles.hero}>
          <nav aria-label={en ? "Breadcrumb" : "위치"} className="mb-3 text-[13px] font-semibold text-slate-600">
            <Link href="/resources" className="hover:text-[#174A7E]">
              {en ? "Resources" : "자료실"}
            </Link>
            <span className="mx-1.5" aria-hidden="true">
              /
            </span>
            <Link href={listHref} className="hover:text-[#174A7E]">
              {pub.name}
            </Link>
          </nav>
          <div className={styles.eyebrow}>{en ? pub.tagline : pub.taglineKo}</div>
          <h1 className={styles.h1}>{issue.title ?? pub.name}</h1>
          <div className={styles.meta}>
            {[
              issue.published_at ? `${en ? "Published" : "발간"} ${issue.published_at}` : null,
              issueLabel(issue.title) || null,
              content.kind === "heartbeat" && content.heartbeat.period ? content.heartbeat.period : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href={pdfHref}
              target="_blank"
              rel="noopener"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#174A7E] px-4 text-sm font-bold text-white transition hover:bg-[#103A66]"
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              {en ? "Open original PDF" : "PDF 원본 보기"}
            </a>
            <Link
              href={listHref}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {en ? "All issues" : "전체 호 목록"}
            </Link>
          </div>
        </header>

        {content.kind === "atm" ? <AtmBody content={content} en={en} /> : null}
        {content.kind === "heartbeat" ? <HeartbeatBody content={content} en={en} /> : null}
        {content.kind === "none" ? (
          <div className={styles.card}>
            <p className={styles.muted}>{en ? "The text of this issue is available in the original PDF." : "이 호의 내용은 PDF 원본에서 볼 수 있습니다."}</p>
          </div>
        ) : null}

        <nav aria-label={en ? "Other issues" : "다른 호"} className="mt-10 grid gap-3 border-t border-slate-200 pt-6 sm:grid-cols-2">
          {older ? (
            <Link href={issuePath(slug, older.id)} className="group rounded-md border border-slate-200 bg-white p-4 transition hover:border-[#2B6CA3]">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                {en ? "Previous issue" : "이전 호"}
              </span>
              <span className="mt-1 block truncate text-sm font-semibold text-slate-900 group-hover:text-[#174A7E]">{older.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {newer ? (
            <Link href={issuePath(slug, newer.id)} className="group rounded-md border border-slate-200 bg-white p-4 text-right transition hover:border-[#2B6CA3]">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
                {en ? "Next issue" : "다음 호"}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span className="mt-1 block truncate text-sm font-semibold text-slate-900 group-hover:text-[#174A7E]">{newer.title}</span>
            </Link>
          ) : null}
        </nav>
      </article>
    </ResourcesFrame>
  );
}

function FallbackText({ text }: { text: string }) {
  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 text-[15px] leading-7 text-slate-800">
      {text.split("\n\n").map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

function AtmBody({ content, en }: { content: Extract<IssueContent, { kind: "atm" }>; en: boolean }) {
  const { items, fallbackText } = content.atm;
  if (!items.length) return fallbackText ? <FallbackText text={fallbackText} /> : null;
  return (
    <section aria-label={en ? "Today's three stories" : "이번 호 뉴스 3건"}>
      <ol className="grid gap-4">
        {items.map((item, i) => (
          <li key={i} className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEF4FA] text-sm font-bold text-[#174A7E]" aria-hidden="true">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[18px] font-semibold leading-7 tracking-[-0.01em] text-slate-950">{item.title}</h2>
                <ul className="mt-3 grid gap-2 text-[15px] leading-7 text-slate-700">
                  {item.bullets.map((b, j) => (
                    <li key={j} className="relative pl-4 before:absolute before:left-0 before:top-[0.8em] before:h-1 before:w-1 before:rounded-full before:bg-slate-400">
                      {b}
                    </li>
                  ))}
                </ul>
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener nofollow"
                    className="mt-4 inline-flex max-w-full items-center gap-1.5 text-[13px] font-semibold text-[#174A7E] hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{en ? "Original article" : "원문 기사"} · {hostOf(item.url)}</span>
                  </a>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function HeartbeatBody({ content, en }: { content: Extract<IssueContent, { kind: "heartbeat" }>; en: boolean }) {
  const { column, toc, fallbackText } = content.heartbeat;
  return (
    <div className="grid gap-6">
      {column ? (
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] md:p-8" aria-labelledby="hb-column">
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#2B6CA3]">{column.heading ?? (en ? "Column" : "칼럼")}</p>
          <h2 id="hb-column" className="scroll-mt-24 mt-2 text-[22px] font-semibold leading-8 tracking-[-0.02em] text-slate-950">
            {column.title ?? (en ? "Notes on this issue" : "이번 호에 덧붙입니다")}
          </h2>
          <div className="mt-5 space-y-4 text-[15px] leading-8 text-slate-800">
            {column.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          {column.signature ? <p className="mt-6 text-right text-sm font-semibold text-slate-700">{column.signature}</p> : null}
        </section>
      ) : null}

      {toc.length ? (
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] md:p-8" aria-labelledby="hb-toc">
          <h2 id="hb-toc" className="scroll-mt-24 text-[18px] font-semibold text-slate-950">
            {toc.some((s) => s.items.length) ? (en ? "In this issue" : "이번 호 목차") : en ? "Sections" : "이번 호 구성"}
          </h2>
          <div className="mt-5 grid gap-6 md:grid-cols-2">
            {toc.map((section, i) => (
              <div key={i}>
                <h3 className="text-[14px] font-bold text-[#174A7E]">
                  {roman(i + 1)}. {section.title}
                </h3>
                {section.items.length ? (
                  <ol className="mt-2 grid gap-1.5 text-[14px] leading-6 text-slate-700">
                    {section.items.map((item, j) => (
                      <li key={j} className="flex gap-2">
                        <span className="w-5 shrink-0 text-right tabular-nums text-slate-500">{j + 1}.</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ol>
                ) : null}
              </div>
            ))}
          </div>
          <p className="mt-6 text-[13px] text-slate-600">{en ? "Full articles are in the original PDF." : "기사 본문은 PDF 원본에서 볼 수 있습니다."}</p>
        </section>
      ) : null}

      {fallbackText ? <FallbackText text={fallbackText} /> : null}
    </div>
  );
}

function roman(n: number) {
  return ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"][n - 1] ?? String(n);
}

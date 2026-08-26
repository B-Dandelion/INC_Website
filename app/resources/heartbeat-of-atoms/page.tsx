import SimpleListPage from "@/components/resources/SimpleListPage";
import styles from "@/components/resources/SimpleListPage.module.css";
import { getLocale } from "@/lib/i18n";

function guessIssue(title: string) {
  const m = title.match(/\bNo\.?\s*(\d{1,4})\b/i);
  return m ? `No. ${m[1]}` : "";
}

function isYmd(s: any) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export default async function HeartbeatPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; d?: string; dir?: string }>;
}) {
  const locale = await getLocale();
  const en = locale === "en";
  const sp = await searchParams;

  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const d = isYmd(sp.d) ? sp.d : "";
  const dir = sp.dir === "after" ? "after" : "before";

  const publishedFrom = d && dir === "after" ? d : undefined;
  const publishedTo = d && dir === "before" ? d : undefined;

  const makePageHref = (p: number) => {
    const qs = new URLSearchParams();
    qs.set("page", String(p));
    if (d) qs.set("d", d);
    if (d) qs.set("dir", dir);
    return `/resources/heartbeat-of-atoms?${qs.toString()}`;
  };

  const heroExtra = (
    <form method="get" action="/resources/heartbeat-of-atoms" className={styles.search}>
      <input type="date" name="d" defaultValue={d} className={styles.searchInput} aria-label={en ? "Publication date" : "발간일"} />
      <select name="dir" defaultValue={dir} className={styles.searchInput} style={{ maxWidth: 160 }} aria-label={en ? "Date direction" : "날짜 기준"}>
        <option value="before">{en ? "On or before" : "이전"}</option>
        <option value="after">{en ? "On or after" : "이후"}</option>
      </select>
      <button className={styles.searchBtn} type="submit">{en ? "Apply" : "적용"}</button>

      {d ? (
        <a href="/resources/heartbeat-of-atoms" className={styles.searchBtn} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
          {en ? "Clear" : "해제"}
        </a>
      ) : null}
    </form>
  );

  return (
    <SimpleListPage
      activeKey="heartbeat-of-atoms"
      title="Heartbeat of Atoms"
      prefix="heartbeat-of-atoms"
      hint="제목 클릭 시 파일이 새 창으로 열립니다."
      hintEn="Click a title to open the file in a new tab."
      rightMetaFromTitle={guessIssue}
      page={page}
      pageSize={50}
      makePageHref={makePageHref}
      publishedFrom={publishedFrom}
      publishedTo={publishedTo}
      heroExtra={heroExtra}
    />
  );
}

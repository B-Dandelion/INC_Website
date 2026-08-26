import ResourcesFrame, { type ResourceNavKey } from "@/components/resources/ResourcesFrame";
import ResourceBoard, { type BoardItem } from "@/components/resources/ResourceBoard";
import styles from "./SimpleListPage.module.css";
import { fetchResources } from "@/lib/resourcesDb";

type Props = {
  activeKey: ResourceNavKey;
  title: string;
  prefix: string;
  hint?: string;
  rightMetaFromTitle?: (title: string) => string;
  page?: number;
  pageSize?: number;
  publishedFrom?: string;
  publishedTo?: string;
  heroExtra?: React.ReactNode;
  makePageHref?: (page: number) => string;
};

function comparableText(value: string) {
  return value
    .replace(/\.[a-z0-9]{1,8}$/i, "")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export default async function SimpleListPage({
  activeKey,
  title,
  prefix,
  hint,
  rightMetaFromTitle,
  page = 1,
  pageSize = 50,
  publishedFrom,
  publishedTo,
  heroExtra,
  makePageHref,
}: Props) {
  const rows = await fetchResources({
    boardSlug: prefix,
    page,
    pageSize,
    publishedFrom,
    publishedTo,
  });

  const isIssueBoard = prefix === "atm" || prefix === "heartbeat-of-atoms";
  const description =
    hint ??
    (isIssueBoard
      ? "발간 자료를 호수와 게시 정보 기준으로 확인할 수 있습니다."
      : "등록된 자료를 목록에서 선택해 확인할 수 있습니다.");

  const boardItems: BoardItem[] = (rows ?? []).map((r: any) => {
    const titleText = ((r.title ?? "").trim() || r.original_filename || "자료").toString();
    const metaLine = isIssueBoard
      ? `발간 ${r.published_at ?? "-"} · 조회 ${r.views_count ?? 0}`
      : `게시 ${r.posted_at ?? "-"} · 조회 ${r.views_count ?? 0}`;

    const note = (r.note ?? "").toString().trim();
    const filename = (r.original_filename ?? "").toString().trim();
    const filenameAddsInfo =
      filename && comparableText(filename) !== comparableText(titleText);
    const base = note || (filenameAddsInfo ? filename : "");
    const subText = base ? `${base} · ${metaLine}` : metaLine;

    return {
      id: r.id,
      title: titleText,
      subtitle: subText,
      rightMeta: rightMetaFromTitle ? rightMetaFromTitle(titleText) : "",
    };
  });

  const hasPrev = page > 1;
  const hasNext = (rows?.length ?? 0) === pageSize;

  return (
    <ResourcesFrame activeKey={activeKey}>
      <div className={styles.content}>
        <header className={styles.hero}>
          <div className={styles.eyebrow}>{isIssueBoard ? "Publication archive" : "Resource archive"}</div>
          <h1 className={styles.h1}>{title}</h1>
          <div className={styles.meta}>{description}</div>
          {heroExtra ? <div className={styles.heroExtra}>{heroExtra}</div> : null}
        </header>

        {boardItems.length === 0 ? (
          <div className={styles.card}>
            <div className={styles.muted}>등록된 자료가 없습니다.</div>
          </div>
        ) : (
          <>
            <div className={styles.listHeader}>
              <div>
                <div className={styles.listKicker}>Archive</div>
                <h2 className={styles.listTitle}>자료 목록</h2>
              </div>
              <span className={styles.listCount}>현재 페이지 {boardItems.length}개</span>
            </div>

            <ResourceBoard items={boardItems} />

            {makePageHref ? (
              <nav className={styles.pager} aria-label="자료 목록 페이지 이동">
                {hasPrev ? (
                  <a className={styles.pagerBtn} href={makePageHref(page - 1)} aria-label="이전 페이지">
                    ← 이전
                  </a>
                ) : (
                  <span className={`${styles.pagerBtn} ${styles.pagerDisabled}`} aria-hidden="true">
                    ← 이전
                  </span>
                )}

                <span className={styles.pageIndicator}>{page}</span>

                {hasNext ? (
                  <a className={styles.pagerBtn} href={makePageHref(page + 1)} aria-label="다음 페이지">
                    다음 →
                  </a>
                ) : (
                  <span className={`${styles.pagerBtn} ${styles.pagerDisabled}`} aria-hidden="true">
                    다음 →
                  </span>
                )}
              </nav>
            ) : null}
          </>
        )}
      </div>
    </ResourcesFrame>
  );
}

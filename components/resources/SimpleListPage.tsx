// components/resources/SimpleListPage.tsx
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

  // 추가
  page?: number;          // 1-based
  pageSize?: number;      // default 50

  publishedFrom?: string; // YYYY-MM-DD
  publishedTo?: string;   // YYYY-MM-DD
  heroExtra?: React.ReactNode;

  // 추가: URL 생성 함수(보드별 page.tsx에서 넘김)
  makePageHref?: (page: number) => string;

};

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

  const boardItems: BoardItem[] = (rows ?? []).map((r: any) => {
    const titleText = ((r.title ?? "").trim() || r.original_filename || "자료").toString();
    const metaLine = `게시 ${r.posted_at ?? "-"} · 조회 ${r.views_count ?? 0}`;
    const base = (r.note ?? r.original_filename ?? "").toString();
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
        <div className={styles.hero}>
          <h1 className={styles.h1}>{title}</h1>
          {hint ? <div className={styles.meta}>{hint}</div> : null}
          {heroExtra ? <div style={{ marginTop: 10 }}>{heroExtra}</div> : null}
        </div>

        {boardItems.length === 0 ? (
          <div className={styles.card}>
            <div className={styles.muted}>등록된 자료가 없습니다.</div>
          </div>
        ) : (
          <>
            <ResourceBoard items={boardItems} />

            {/* pager */}
            {makePageHref ? (
              <div className={styles.pager}>
                {hasPrev ? (
                  <a className={styles.pagerBtn} href={makePageHref(page - 1)} aria-label="이전" title="이전">
                    ‹
                  </a>
                ) : (
                  <span className={styles.pagerBtn} style={{ visibility: "hidden" }}>
                    ‹
                  </span>
                )}

                {hasNext ? (
                  <a className={styles.pagerBtn} href={makePageHref(page + 1)} aria-label="다음" title="다음">
                    ›
                  </a>
                ) : (
                  <span className={styles.pagerBtn} style={{ visibility: "hidden" }}>
                    ›
                  </span>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>
    </ResourcesFrame>
  );
}
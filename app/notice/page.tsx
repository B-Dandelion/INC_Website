// app/notice/page.tsx
import NoticeFrame from "@/components/notices/NoticeFrame";
import styles from "@/components/resources/SimpleListPage.module.css";
import NoticeBoard, { type NoticeBoardItem } from "@/components/notices/NoticeBoard";
import { fetchNotices } from "@/lib/noticesDb";

export default async function NoticeListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const pageSize = 50;

  // 한 건을 더 조회해 다음 페이지가 실제로 존재하는지 판별한다.
  const fetchedRows = await fetchNotices({ page, pageSize: pageSize + 1 });
  const rows = fetchedRows.slice(0, pageSize);
  const hasNext = fetchedRows.length > pageSize;
  const hasPrev = page > 1;

  const items: NoticeBoardItem[] = rows.map((n) => ({
    id: n.id,
    title: n.pinned ? `📌 ${n.title}` : n.title,
    subtitle: `게시 ${n.posted_at ?? "-"}`,
    rightMeta: "",
    href: `/notice/${n.id}`,
  }));

  // 사이드바는 현재 페이지와 관계없이 항상 최신 공지를 보여준다.
  const latestRows = page === 1 ? rows.slice(0, 10) : await fetchNotices({ page: 1, pageSize: 10 });
  const sideItems = latestRows.map((n) => ({
    id: n.id,
    title: n.pinned ? `📌 ${n.title}` : n.title,
    posted_at: n.posted_at ?? "-",
  }));

  return (
    <NoticeFrame sideItems={sideItems} activeId={null}>
      <div className={styles.content}>
        <div className={styles.hero}>
          <h1 className={styles.h1}>공지사항</h1>
          <div className={styles.meta}>INC 공지사항을 확인하세요.</div>
        </div>

        {items.length === 0 ? (
          <div className={styles.card}>
            <div className={styles.muted}>등록된 공지사항이 없습니다.</div>
          </div>
        ) : (
          <NoticeBoard items={items} />
        )}

        {items.length > 0 ? (
          <div className={styles.pager} aria-label="공지사항 페이지 이동">
            {hasPrev ? (
              <a className={styles.pagerBtn} href={`/notice?page=${page - 1}`}>
                ← 이전
              </a>
            ) : (
              <span className={`${styles.pagerBtn} ${styles.pagerDisabled}`}>← 이전</span>
            )}

            <span className={styles.pageIndicator} aria-label={`현재 ${page}페이지`}>
              {page}
            </span>

            {hasNext ? (
              <a className={styles.pagerBtn} href={`/notice?page=${page + 1}`}>
                다음 →
              </a>
            ) : (
              <span className={`${styles.pagerBtn} ${styles.pagerDisabled}`}>다음 →</span>
            )}
          </div>
        ) : null}
      </div>
    </NoticeFrame>
  );
}

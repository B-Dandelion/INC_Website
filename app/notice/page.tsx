// app/notice/page.tsx
import NoticeFrame from "@/components/notices/NoticeFrame";
import styles from "@/components/resources/SimpleListPage.module.css";
import NoticeBoard, { type NoticeBoardItem } from "@/components/notices/NoticeBoard";
import { fetchNotices } from "@/lib/noticesDb";
import { getLocale } from "@/lib/i18n";

export default async function NoticeListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const locale = await getLocale();
  const en = locale === "en";
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const pageSize = 50;

  const fetchedRows = await fetchNotices({ page, pageSize: pageSize + 1 });
  const rows = fetchedRows.slice(0, pageSize);
  const hasNext = fetchedRows.length > pageSize;
  const hasPrev = page > 1;

  const items: NoticeBoardItem[] = rows.map((n) => ({
    id: n.id,
    title: n.pinned ? `📌 ${n.title}` : n.title,
    subtitle: `${en ? "Posted" : "게시"} ${n.posted_at ?? "-"}`,
    rightMeta: "",
    href: `/notice/${n.id}`,
  }));

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
          <h1 className={styles.h1}>{en ? "Notices" : "공지사항"}</h1>
          <div className={styles.meta}>{en ? "View announcements and updates from INC." : "INC 공지사항을 확인하세요."}</div>
        </div>

        {items.length === 0 ? (
          <div className={styles.card}>
            <div className={styles.muted}>{en ? "There are no notices to display." : "등록된 공지사항이 없습니다."}</div>
          </div>
        ) : (
          <NoticeBoard items={items} />
        )}

        {items.length > 0 ? (
          <div className={styles.pager} aria-label={en ? "Notice pagination" : "공지사항 페이지 이동"}>
            {hasPrev ? (
              <a className={styles.pagerBtn} href={`/notice?page=${page - 1}`}>
                ← {en ? "Previous" : "이전"}
              </a>
            ) : (
              <span className={`${styles.pagerBtn} ${styles.pagerDisabled}`}>← {en ? "Previous" : "이전"}</span>
            )}

            <span className={styles.pageIndicator} aria-label={en ? `Page ${page}` : `현재 ${page}페이지`}>
              {page}
            </span>

            {hasNext ? (
              <a className={styles.pagerBtn} href={`/notice?page=${page + 1}`}>
                {en ? "Next" : "다음"} →
              </a>
            ) : (
              <span className={`${styles.pagerBtn} ${styles.pagerDisabled}`}>{en ? "Next" : "다음"} →</span>
            )}
          </div>
        ) : null}
      </div>
    </NoticeFrame>
  );
}

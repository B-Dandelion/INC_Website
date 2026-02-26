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

  const rows = await fetchNotices({ page, pageSize });

  const items: NoticeBoardItem[] = rows.map((n) => ({
    id: n.id,
    title: n.pinned ? `📌 ${n.title}` : n.title,
    subtitle: `게시 ${n.posted_at ?? "-"}`,
    rightMeta: "",
    href: `/notice/${n.id}`,
  }));

  const hasPrev = page > 1;
  const hasNext = rows.length === pageSize;

  const sideItems = rows.slice(0, 10).map((n) => ({
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

        <div className={styles.pager}>
          {hasPrev ? (
            <a className={styles.pagerBtn} href={`/notice?page=${page - 1}`} aria-label="이전" title="이전">
              ‹
            </a>
          ) : (
            <span className={styles.pagerBtn} style={{ visibility: "hidden" }}>
              ‹
            </span>
          )}

          {hasNext ? (
            <a className={styles.pagerBtn} href={`/notice?page=${page + 1}`} aria-label="다음" title="다음">
              ›
            </a>
          ) : (
            <span className={styles.pagerBtn} style={{ visibility: "hidden" }}>
              ›
            </span>
          )}
        </div>
      </div>
    </NoticeFrame>
  );
}
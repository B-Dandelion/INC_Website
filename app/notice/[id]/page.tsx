// app/notice/[id]/page.tsx
import Link from "next/link";
import styles from "@/components/resources/SimpleListPage.module.css";
import NoticeFrame from "@/components/notices/NoticeFrame";
import { fetchNoticeById, fetchNotices } from "@/lib/noticesDb";
import { notFound } from "next/navigation";

export default async function NoticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const nid = Number(id);
  if (!Number.isFinite(nid) || nid <= 0) return notFound();

  const row = await fetchNoticeById(nid);
  if (!row) return notFound();

  // sidebar 최신 10개
  const latest = await fetchNotices({ page: 1, pageSize: 10 });
  const sideItems = latest.map((n) => ({
    id: n.id,
    title: n.pinned ? `📌 ${n.title}` : n.title,
    posted_at: n.posted_at ?? "-",
  }));

  return (
    <NoticeFrame sideItems={sideItems} activeId={nid}>
      <div className={styles.content}>
        <div className={styles.hero}>
          <h1 className={styles.h1}>{row.title}</h1>
          {/* '게시' 제거: 날짜만 */}
          <div className={styles.meta}>{row.posted_at ?? "-"}</div>
        </div>

        <div className={styles.card}>
          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, color: "#0f172a" }}>
            {row.content}
          </div>

          {/* 목록 버튼: 본문 아래로 */}
          <div style={{ marginTop: 18 }}>
            <Link href="/notice" style={{ textDecoration: "none", color: "#2563eb", fontWeight: 900 }}>
              ← 목록으로
            </Link>
          </div>
        </div>
      </div>
    </NoticeFrame>
  );
}
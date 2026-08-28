import type { Metadata } from "next";
import { fetchNoticeById } from "@/lib/noticesDb";
import { descriptionFromText, makeMetadata, NOINDEX_METADATA } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const noticeId = Number(id);
  if (!Number.isFinite(noticeId) || noticeId <= 0) return NOINDEX_METADATA;

  const notice = await fetchNoticeById(noticeId);
  if (!notice) return NOINDEX_METADATA;

  return makeMetadata({
    title: notice.title,
    description: descriptionFromText(
      notice.content,
      `INC 공지사항: ${notice.title}`,
    ),
    path: `/notice/${notice.id}`,
    type: "article",
  });
}

export default function NoticeDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}

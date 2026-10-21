import { notFound, redirect } from "next/navigation";
import ResourcesFrame, { NAV } from "@/components/resources/AdminResourcesFrame";
import BulkUploader from "@/components/admin/resources/BulkUploader";
import { PageHeader } from "@/components/admin/ui";
import { adminSlugToEventCategory } from "@/lib/eventCategoryMap";
import { ISSUE_BOARD_SLUGS } from "@/lib/resourceFilters";

export default async function AdminUploadPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Event boards attach files from the event detail screen instead.
  if (adminSlugToEventCategory(slug)) redirect(`/admin-x7k3p9/resources/${slug}`);
  const board = NAV.find((x) => x.key === slug);
  if (!board) notFound();

  return (
    <ResourcesFrame activeKey={slug}>
      <div className="grid gap-5">
        <PageHeader eyebrow={`자료실 · ${board.label}`} title="자료 올리기" description="파일을 끌어 놓고 제목·날짜를 확인한 뒤 한 번에 올립니다." />
        <BulkUploader boardSlug={slug} boardLabel={board.label} isIssue={ISSUE_BOARD_SLUGS.has(slug)} />
      </div>
    </ResourcesFrame>
  );
}

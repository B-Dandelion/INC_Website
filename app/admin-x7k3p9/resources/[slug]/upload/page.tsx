import { notFound, redirect } from "next/navigation";
import ResourcesFrame from "@/components/resources/AdminResourcesFrame";
import BulkUploader from "@/components/admin/resources/BulkUploader";
import { PageHeader } from "@/components/admin/ui";
import { boardRule } from "@/lib/boardRules";

export default async function AdminUploadPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const board = boardRule(slug);
  if (!board) notFound();
  // Event boards attach files from the event detail screen instead.
  if (board.type === "event") redirect(`/admin-x7k3p9/resources/${slug}`);

  return (
    <ResourcesFrame activeKey={slug}>
      <div className="grid gap-5">
        <PageHeader eyebrow={`자료실 · ${board.label}`} title="자료 올리기" description={board.uploadHint} />
        <BulkUploader boardSlug={slug} boardLabel={board.label} isIssue={board.dateRequired} />
      </div>
    </ResourcesFrame>
  );
}

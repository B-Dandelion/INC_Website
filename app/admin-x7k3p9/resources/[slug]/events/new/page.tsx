import { notFound } from "next/navigation";
import ResourcesFrame from "@/components/resources/AdminResourcesFrame";
import NewEventForm from "@/components/admin/events/NewEventForm";
import { PageHeader } from "@/components/admin/ui";
import { eventBoardRule } from "@/lib/boardRules";

export default async function AdminEventNewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ subtype?: string }>;
}) {
  const { slug } = await params;
  const rule = eventBoardRule(slug);
  if (!rule) notFound();
  const { subtype } = await searchParams;
  const initialSubtype = rule.subtypes?.some((s) => s.value === subtype) ? subtype : rule.defaultSubtype;

  return (
    <ResourcesFrame activeKey={slug} subtype={initialSubtype}>
      <div className="grid gap-5">
        <PageHeader eyebrow={`자료실 · ${rule.label}`} title="새 행사" description="행사를 만든 뒤 포스터·사진·자료를 붙일 수 있습니다." />
        <NewEventForm rule={rule} initialSubtype={initialSubtype} />
      </div>
    </ResourcesFrame>
  );
}

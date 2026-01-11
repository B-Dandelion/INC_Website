import ResourceList from "@/components/resources/ResourceList";
import PageShell from "@/components/PageShell";

export default function ResourcesPage() {
  return (
    <PageShell title="자료실" description="발간물 및 자료를 제공합니다.">
      <ResourceList items={[]} emptyText="자료 준비중" />
    </PageShell>
  );
}
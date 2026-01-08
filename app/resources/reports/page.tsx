import Link from "next/link";
import PageShell from "@/components/PageShell";
import ResourceList from "@/components/resources/ResourceList";
import { resourcesData } from "@/lib/resourcesData";

export default function ReportsPage() {
  return (
    <PageShell
      title="Reports"
      description="지금까지 받은 보고서 PDF"
    >
      <p>
        <Link href="/resources">← 자료실로</Link>
      </p>

      <ResourceList items={resourcesData.reports} />
    </PageShell>
  );
}

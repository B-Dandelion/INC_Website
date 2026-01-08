import Link from "next/link";
import PageShell from "@/components/PageShell";
import ResourceList from "@/components/resources/ResourceList";
import { resourcesData } from "@/lib/resourcesData";

export default function EventsPage() {
  return (
    <PageShell
      title="Other Events"
      description="기타 행사 자료 모음"
    >
      <p>
        <Link href="/resources">← 자료실로</Link>
      </p>

      <ResourceList items={resourcesData.events} />
    </PageShell>
  );
}
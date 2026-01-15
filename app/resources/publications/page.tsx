import Link from "next/link";
import PageShell from "@/components/PageShell";
import ResourceList from "@/components/resources/ResourceList";
import { resourcesData } from "@/lib/resourcesData";
import { toResourceItems } from "@/lib/resourceAdapter";

export default function EventsPage() {
  return (
    <PageShell title="Other Events" description="기타 행사 자료 모음">
      <p><Link href="/resources">← 자료실로</Link></p>

      <ResourceList items={toResourceItems(resourcesData.events, "events", "기타 행사")} />
    </PageShell>
  );
}

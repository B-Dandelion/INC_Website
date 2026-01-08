import Link from "next/link";
import PageShell from "@/components/PageShell";
import ResourceList from "@/components/resources/ResourceList";
import { resourcesData } from "@/lib/resourcesData";

export default function PublicationsPage() {
  const { atm, heartbeat } = resourcesData.publications;

  return (
    <PageShell
      title="Publications"
      description="ATM, Heartbeat of Atoms 발간 자료 아카이브"
    >
      <p>
        <Link href="/resources">← 자료실로</Link>
      </p>

      <h3>ATM</h3>
      <ResourceList items={atm} />

      <h3 style={{ marginTop: 18 }}>Heartbeat of Atoms</h3>
      <ResourceList items={heartbeat} />
    </PageShell>
  );
}
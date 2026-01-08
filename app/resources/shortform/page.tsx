import Link from "next/link";
import PageShell from "@/components/PageShell";
import ResourceList from "@/components/resources/ResourceList";
import { resourcesData } from "@/lib/resourcesData";

export default function ShortformPage() {
  return (
    <PageShell
      title="Short-form"
      description="숏폼 에세이 자료 (수상작과 동일한 정리 방식 권장)"
    >
      <p>
        <Link href="/resources">← 자료실로</Link>
      </p>

      <ResourceList items={resourcesData.shortform} />
    </PageShell>
  );
}

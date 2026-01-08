import Link from "next/link";
import PageShell from "@/components/PageShell";
import ResourceList from "@/components/resources/ResourceList";
import { resourcesData } from "@/lib/resourcesData";

export default function AwardsPage() {
  const { essayKr, essayEn, photos } = resourcesData.awards;

  return (
    <PageShell
      title="Awards"
      description="에세이 행사 소개 포스트(국/영) 수상작 + 작품별 파일 + 행사 사진"
    >
      <p>
        <Link href="/resources">← 자료실로</Link>
      </p>

      <h3>국문 수상작</h3>
      <ResourceList items={essayKr} />

      <h3 style={{ marginTop: 18 }}>영문 수상작</h3>
      <ResourceList items={essayEn} />

      <h3 style={{ marginTop: 18 }}>행사 사진</h3>
      <ResourceList items={photos} />
    </PageShell>
  );
}

import Link from "next/link";
import PageShell from "@/components/PageShell";
import ResourceList, { type ResourceItem } from "@/components/resources/ResourceList";
import { resourcesData } from "@/lib/resourcesData";

function toResourceItems(raw: any[], boardTitle: string, boardSlug: string): ResourceItem[] {
  return raw.map((x: any) => ({
    id: x.id,
    title: x.title,
    displayname: x.note ?? x.displayname ?? null,
    kind: x.kind,
    href: x.href,

    date: x.date ?? "2025-01-01",
    visibility: x.visibility ?? "public",
    canView: true,
    canDownload: false,

    boardSlug,
    boardTitle,
    originalFilename: x.originalFilename ?? "",
  }));
}

export default function AwardsPage() {
  const { essayKr: essayKrRaw, essayEn: essayEnRaw, photos: photosRaw } = resourcesData.awards;

  const essayKr = toResourceItems(essayKrRaw, "수상작", "awards");
  const essayEn = toResourceItems(essayEnRaw, "수상작", "awards");
  const photos = toResourceItems(photosRaw, "수상작", "awards");

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
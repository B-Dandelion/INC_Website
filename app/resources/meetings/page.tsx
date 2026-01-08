import Link from "next/link";
import PageShell from "@/components/PageShell";
import ResourceList from "@/components/resources/ResourceList";
import { resourcesData } from "@/lib/resourcesData";

export default function MeetingsPage() {
  const { intro, slides, photos } = resourcesData.meetings;

  return (
    <PageShell
      title="Dalgaebi Meetings"
      description="달개비 회의 자료: 행사 소개문 / 발표 자료 / 사진"
    >
      <p>
        <Link href="/resources">← 자료실로</Link>
      </p>

      <h3>행사 소개문</h3>
      <ResourceList items={intro} />

      <h3 style={{ marginTop: 18 }}>발표 자료</h3>
      <ResourceList items={slides} />

      <h3 style={{ marginTop: 18 }}>사진</h3>
      <ResourceList items={photos} />
    </PageShell>
  );
}

import ResourcesFrame from "@/components/resources/ResourcesFrame";
import ResourceBoard, { type BoardItem } from "@/components/resources/ResourceBoard";
import { fetchPublicResources } from "@/lib/resourcesDb"; // 네 프로젝트에 이미 있던 함수 기준
import PageShell from "@/components/PageShell";

function guessIssue(title: string) {
  // "ATM No. 12", "12호", "12" 같은 케이스 대충 대응
  const m = title.match(/(\d{1,4})/);
  return m ? `No. ${m[1]}` : "";
}

export default async function ATMPage() {
  const rows = await fetchPublicResources({ boardSlug: "atm" }); // category 키는 네 DB 기준에 맞춰
  const items: BoardItem[] = (rows ?? []).map((r: any) => {
    const title = (r.title ?? r.original_filename ?? "자료").toString();
    return {
      id: r.id,
      title,
      subtitle: r.description ?? r.summary ?? "", // 있으면 노출, 없으면 빈값
      rightMeta: guessIssue(title),
    };
  });

  return (
    <ResourcesFrame activeKey="atm">
      <PageShell title="ATM">
        <ResourceBoard items={items} />
      </PageShell>
    </ResourcesFrame>
  );
}

import ResourcesFrame from "@/components/resources/ResourcesFrame";
import ResourceBoard, { type BoardItem } from "@/components/resources/ResourceBoard";
import { fetchPublicResources } from "@/lib/resourcesDb";
import PageShell from "@/components/PageShell";

function guessIssue(title: string) {
  const m = title.match(/(\d{1,4})/);
  return m ? `No. ${m[1]}` : "";
}

export default async function HeartbeatPage() {
  const rows = await fetchPublicResources({ boardSlug: "heartbeat" });
  const items: BoardItem[] = (rows ?? []).map((r: any) => {
    const title = (r.title ?? r.original_filename ?? "자료").toString();
    return {
      id: r.id,
      title,
      subtitle: r.description ?? r.summary ?? "",
      rightMeta: guessIssue(title),
    };
  });

  return (
    <ResourcesFrame activeKey="heartbeat">
      <PageShell title="Heartbeat of Atoms">
        <ResourceBoard items={items} />
      </PageShell>
    </ResourcesFrame>
  );
}

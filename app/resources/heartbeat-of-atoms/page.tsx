import SimpleListPage from "@/components/resources/SimpleListPage";

function guessIssue(title: string) {
  const m = title.match(/\bNo\.?\s*(\d{1,4})\b/i);
  return m ? `No. ${m[1]}` : "";
}

export default async function HeartbeatPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  return (
    <SimpleListPage
      activeKey="heartbeat-of-atoms"
      title="Heartbeat of Atoms"
      prefix="heartbeat-of-atoms"
      hint="제목 클릭 시 파일이 새 창으로 열립니다."
      rightMetaFromTitle={guessIssue}
      page={page}
      pageSize={50}
      makePageHref={(p) => `/resources/heartbeat-of-atoms?page=${p}`}
    />
  );
}
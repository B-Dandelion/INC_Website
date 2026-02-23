import SimpleListPage from "@/components/resources/SimpleListPage";

export default async function ExpertPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  return (
    <SimpleListPage
      activeKey="expert-opinion-report"
      title="전문가 의견 보고서"
      prefix="expert-opinion-report"
      page={page}
      pageSize={50}
      makePageHref={(p) => `/resources/expert-opinion-report?page=${p}`}
    />
  );
}
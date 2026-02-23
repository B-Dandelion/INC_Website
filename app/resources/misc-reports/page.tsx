import SimpleListPage from "@/components/resources/SimpleListPage";

export default async function MiscreportPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  return (
    <SimpleListPage
      activeKey="misc-reports"
      title="기타 보고서"
      prefix="misc-reports"
      page={page}
      pageSize={50}
      makePageHref={(p) => `/resources/misc-reports?page=${p}`}
    />
  );
}
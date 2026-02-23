import SimpleListPage from "@/components/resources/SimpleListPage";

export default async function ContributionPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  return (
    <SimpleListPage
      activeKey="contribution"
      title="기고문"
      prefix="contribution"
      page={page}
      pageSize={50}
      makePageHref={(p) => `/resources/contribution?page=${p}`}
    />
  );
}
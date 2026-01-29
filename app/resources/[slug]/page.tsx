import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import { resourceCategories } from "@/lib/resourceCategories";
import { fetchResourcesByCategoryPage } from "@/lib/resourcesDb";
import ResourceBoard from "@/components/resources/ResourceBoard";
import AdminUploadButton from "@/components/resources/AdminUploadButton";

export default async function ResourceCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { slug } = await params;
  const { page, q } = await searchParams;

  const pageNum = Math.max(1, Number(page ?? "1") || 1);

  // cat은 "표시용 라벨"만 쓰는 용도
  const cat = resourceCategories.find((c) => c.href === `/resources/${slug}`);
  if (!cat) notFound();

  // 조회는 slug로
  const { items, total } = await fetchResourcesByCategoryPage({
    slug,
    page: pageNum,
    pageSize: 10,
    q: (q ?? "").trim(),
  });

  return (
    <PageShell title ={cat.label} description="카테고리별 자료 목록입니다.">
      <div className="flex items-center justify-end mb-4">
        <AdminUploadButton defaultCategory={slug} />
      </div>

      <ResourceBoard
        items={items}
        total={total}
        page={pageNum}
        pageSize={10}
        baseHref={`/resources/${slug}`}
        query={q ?? ""}
      />
    </PageShell>
  );
}
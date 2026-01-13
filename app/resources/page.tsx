// app/resources/page.tsx
import Link from "next/link";
import PageShell from "@/components/PageShell";
import ResourceList, { type ResourceItem } from "@/components/resources/ResourceList";
import { fetchPublicResources } from "@/lib/resourcesDb";
import { RESOURCE_BOARDS } from "@/lib/resourceBoards";

export default async function ResourcesPage({
  searchParams,
}: {
  // Next 버전에 따라 Promise일 수도, 그냥 객체일 수도 있어서 둘 다 허용
  searchParams?: Promise<{ cat?: string }> | { cat?: string };
}) {
  const sp = searchParams ? await Promise.resolve(searchParams) : {};
  const cat = (sp.cat ?? "").trim();

  const selected = RESOURCE_BOARDS.find((x) => x.slug === cat) ?? null;

  const rows = await fetchPublicResources({
    limit: 50,
    boardSlug: selected?.slug,
  });

const items: ResourceItem[] = rows.map((r) => {
  const date = r.published_at ?? r.created_at.slice(0, 10); // YYYY-MM-DD

  return {
    id: r.id,
    title: r.title,
    kind: r.kind,
    note: r.note ?? undefined,
    date,
    visibility: r.visibility,
    canView: true,
    canDownload: !!r.r2_key,
  };
});

  return (
    <PageShell
      title="자료실"
      description={selected ? `카테고리: ${selected.label}` : "전체 자료를 확인할 수 있습니다."}
    >
      <div className="flex items-center gap-2 mb-4 text-sm">
        {selected ? (
          <>
            <span className="text-gray-800 font-semibold">{selected.label}</span>
            <Link className="text-blue-600 hover:underline" href="/resources">
              전체 보기
            </Link>
          </>
        ) : (
          <span className="text-gray-600">전체 보기</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href="/resources"
          className={`px-3 py-1.5 rounded-full border text-sm ${
            !selected
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-gray-200 text-gray-700 hover:border-gray-300"
          }`}
        >
          전체
        </Link>

        {RESOURCE_BOARDS.map((x) => (
          <Link
            key={x.slug}
            href={`/resources?cat=${x.slug}`}
            className={`px-3 py-1.5 rounded-full border text-sm ${
              selected?.slug === x.slug
                ? "border-blue-600 text-blue-600 font-semibold"
                : "border-gray-200 text-gray-700 hover:border-gray-300"
            }`}
          >
            {x.label}
          </Link>
        ))}
      </div>

      <ResourceList key={selected?.slug ?? "all"} items={items} />
    </PageShell>
  );
}
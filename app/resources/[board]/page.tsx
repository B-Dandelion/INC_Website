// app/resources/[board]/page.tsx
export const dynamic = "force-dynamic";

import ResourcesShell from "@/components/resources/ResourcesShell";
import ResourcesSidebar from "@/components/resources/ResourcesSidebar";
import ResourceList from "@/components/resources/ResourceList";
import {
  fetchBoards,
  fetchResources,
  fetchSourcePaths,
  isNestedBoard,
} from "@/lib/resourcesDb";

export default async function BoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ board: string }>;
  searchParams: Promise<{ path?: string; q?: string; page?: string }>;
}) {
  const { board } = await params;
  const sp = await searchParams;

  const boardSlug = decodeURIComponent(board);
  const path = sp.path ? decodeURIComponent(sp.path) : undefined;
  const q = sp.q?.trim() || "";
  const page = Number(sp.page ?? "1") || 1;

  const boards = await fetchBoards();
  const nestedSourcePaths = isNestedBoard(boardSlug)
    ? await fetchSourcePaths(boardSlug)
    : [];

  const rows = await fetchResources({
    boardSlug,
    path,
    q,
    page,
    pageSize: 30,
  });

  const boardTitle = boards.find((b) => b.slug === boardSlug)?.title ?? boardSlug;

  return (
    <ResourcesShell
      title={boardTitle}
      sidebar={
        <ResourcesSidebar
          boards={boards}
          activeBoardSlug={boardSlug}
          nestedSourcePaths={nestedSourcePaths}
          activePath={path}
        />
      }
    >
      <ResourceList rows={rows} />
    </ResourcesShell>
  );
}

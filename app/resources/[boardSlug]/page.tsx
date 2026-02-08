// app/resources/[boardSlug]/page.tsx
import ResourcePageShell from "@/components/resources/ResourcePageShell";
import {
  fetchBoards,
  fetchResources,
  fetchSourcePaths,
  buildSourcePathTree,
  isNestedBoard,
} from "@/lib/resourcesDb";
import { notFound } from "next/navigation";

function num(v: string | string[] | undefined, def: number) {
  const s = Array.isArray(v) ? v[0] : v;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : def;
}

export default async function BoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ boardSlug: string }>;
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string; path?: string }>;
}) {
  const { boardSlug } = await params;
  const sp = await searchParams;

  const q = (sp.q ?? "").trim();
  const page = num(sp.page, 1);
  const pageSize = Math.min(100, Math.max(10, num(sp.pageSize, 30)));
  const path = (sp.path ?? "").trim() || undefined;

  const boards = await fetchBoards();
  const board = boards.find((b) => b.slug === boardSlug);
  if (!board) notFound();

  let treeRoot: any = null;
  if (isNestedBoard(boardSlug)) {
    const paths = await fetchSourcePaths(boardSlug);
    treeRoot = buildSourcePathTree(boardSlug, paths);
  }

  const rows = await fetchResources({ boardSlug, path, q, page, pageSize });

  return (
    <ResourcePageShell
      boards={boards}
      activeBoardSlug={boardSlug}
      title={board.title}
      rows={rows}
      showBoardBadge={false}
      treeRoot={treeRoot}
      q={q}
      path={path}
      page={page}
      pageSize={pageSize}
    />
  );
}

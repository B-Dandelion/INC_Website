// app/resources/page.tsx
import ResourcePageShell from "@/components/resources/ResourcePageShell";
import { fetchBoards, fetchResources } from "@/lib/resourcesDb";

function num(v: string | string[] | undefined, def: number) {
  const s = Array.isArray(v) ? v[0] : v;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : def;
}

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string }>;
}) {
  const sp = await searchParams;

  const q = (sp.q ?? "").trim();
  const page = num(sp.page, 1);
  const pageSize = Math.min(100, Math.max(10, num(sp.pageSize, 30)));

  const boards = await fetchBoards();
  const rows = await fetchResources({ q, page, pageSize });

  return (
    <ResourcePageShell
      boards={boards}
      title="전체 게시물"
      rows={rows}
      showBoardBadge
      q={q}
      page={page}
      pageSize={pageSize}
    />
  );
}
// app/resources/[boardSlug]/page.tsx
import { notFound } from "next/navigation";
import BoardSidebar from "@/components/resources/BoardSidebar";
import ResourceList from "@/components/resources/ResourceList";
import styles from "@/components/resources/resources.module.css";
import {
  fetchBoards,
  fetchResources,
  fetchSourcePaths,
  buildSourcePathTree,
  isNestedBoard,
} from "@/lib/resourcesDb";

type SP = Record<string, string | string[] | undefined>;

export default async function BoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ boardSlug: string }>;
  searchParams: Promise<SP>;
}) {
  const { boardSlug } = await params;
  const sp = await searchParams;

  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : "1") || 1);
  const path = typeof sp.path === "string" ? sp.path : undefined;

  const boards = await fetchBoards();
  const board = boards.find((b) => b.slug === boardSlug);
  if (!board) return notFound();

  let nestedTree: any = null;
  if (isNestedBoard(boardSlug)) {
    const sourcePaths = await fetchSourcePaths(boardSlug);
    nestedTree = buildSourcePathTree(boardSlug, sourcePaths);
  }

  const rows = await fetchResources({
    boardSlug,
    path: path || undefined,
    q: q || undefined,
    page,
    pageSize: 30,
  });

  const nextParams = new URLSearchParams();
  if (q) nextParams.set("q", q);
  if (path) nextParams.set("path", path);
  nextParams.set("page", String(page + 1));

  const baseQs = new URLSearchParams();
  if (q) baseQs.set("q", q);
  if (path) baseQs.set("path", path);

  return (
    <div className={styles.shell}>
      <BoardSidebar
        boards={boards}
        activeSlug={boardSlug}
        nestedTree={nestedTree}
        selectedPath={path}
        q={q || undefined}
      />

      <main className={styles.main}>
        <div className={styles.header}>
          <div>
            <div className={styles.h1}>{board.title}</div>
            <div className={styles.h2}>
              {path ? `전체 게시물 · ${path.replaceAll("\\", "/").split("/").slice(1).join(" / ")}` : "전체 게시물"}
            </div>
          </div>

          <form className={styles.search} method="get" action={`/resources/${boardSlug}`}>
            {path ? <input type="hidden" name="path" value={path} /> : null}
            <input
              className={styles.searchInput}
              name="q"
              defaultValue={q}
              placeholder="검색 (제목)"
            />
            <button className={styles.searchBtn} type="submit">
              검색
            </button>
          </form>
        </div>

        <ResourceList rows={rows} />

        <div className={styles.pager}>
          {page > 1 ? (
            <a
              className={styles.pagerBtn}
              href={`/resources/${boardSlug}?${(() => {
                const p = new URLSearchParams(baseQs);
                p.set("page", String(page - 1));
                return p.toString();
              })()}`}
            >
              이전
            </a>
          ) : <span />}

          <a className={styles.pagerBtn} href={`/resources/${boardSlug}?${nextParams.toString()}`}>
            다음
          </a>
        </div>
      </main>
    </div>
  );
}

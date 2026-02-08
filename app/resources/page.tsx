// app/resources/page.tsx
import BoardSidebar from "@/components/resources/BoardSidebar";
import ResourceList from "@/components/resources/ResourceList";
import styles from "@/components/resources/resources.module.css";
import { fetchBoards, fetchResources } from "@/lib/resourcesDb";

type SP = Record<string, string | string[] | undefined>;

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : "1") || 1);

  const boards = await fetchBoards();
  const rows = await fetchResources({ q: q || undefined, page, pageSize: 30 });

  const nextParams = new URLSearchParams();
  if (q) nextParams.set("q", q);
  nextParams.set("page", String(page + 1));

  return (
    <div className={styles.shell}>
      <BoardSidebar boards={boards} q={q || undefined} />

      <main className={styles.main}>
        <div className={styles.header}>
          <div>
            <div className={styles.h1}>자료실</div>
            <div className={styles.h2}>전체 게시물</div>
          </div>

          <form className={styles.search} method="get" action="/resources">
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

        <ResourceList rows={rows} showBoardBadge />

        <div className={styles.pager}>
          {page > 1 ? (
            <a className={styles.pagerBtn} href={`/resources?q=${encodeURIComponent(q)}&page=${page - 1}`}>
              이전
            </a>
          ) : <span />}

          <a className={styles.pagerBtn} href={`/resources?${nextParams.toString()}`}>
            다음
          </a>
        </div>
      </main>
    </div>
  );
}

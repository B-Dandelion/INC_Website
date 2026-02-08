// components/resources/ResourcePageShell.tsx
import Link from "next/link";
import styles from "./resources.module.css";
import ResourceNav from "./ResourceNav";
import ResourceSearchBar from "./ResourceSearchBar";
import ResourceList from "./ResourceList";
import type { BoardRow, ResourceRow } from "@/lib/resourcesDb";

function buildHref(base: string, params: Record<string, string | undefined>) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && v.trim()) usp.set(k, v);
  }
  const qs = usp.toString();
  return qs ? `${base}?${qs}` : base;
}

export default function ResourcePageShell({
  boards,
  activeBoardSlug,
  title,
  rows,
  showBoardBadge,
  treeRoot,
  q,
  path,
  page,
  pageSize,
}: {
  boards: BoardRow[];
  activeBoardSlug?: string;
  title: string;
  rows: ResourceRow[];
  showBoardBadge?: boolean;
  treeRoot?: any; // buildSourcePathTree 결과(Map 포함) 그대로 받음
  q?: string;
  path?: string;
  page: number;
  pageSize: number;
}) {
  const basePath = activeBoardSlug ? `/resources/${activeBoardSlug}` : "/resources";

  const prevHref =
    page > 1
      ? buildHref(basePath, {
          q,
          path,
          page: String(page - 1),
          pageSize: String(pageSize),
        })
      : null;

  // total count 안 쓰는 “가벼운” 페이지네이션: pageSize만큼 꽉 찼으면 다음이 있을 수 있음
  const nextHref =
    rows.length >= pageSize
      ? buildHref(basePath, {
          q,
          path,
          page: String(page + 1),
          pageSize: String(pageSize),
        })
      : null;

  return (
    <div className={styles.layout}>
      <ResourceNav
        boards={boards}
        activeBoardSlug={activeBoardSlug}
        treeRoot={treeRoot}
        q={q}
        pageSize={String(pageSize)}
        activePath={path}
      />

      <main className={styles.content}>
        <div className={styles.headerRow}>
          <div className={styles.pageTitle}>{title}</div>
          <ResourceSearchBar basePath={basePath} />
        </div>

        <ResourceList rows={rows} showBoardBadge={showBoardBadge} />

        <div className={styles.pager}>
          {prevHref ? (
            <Link className={styles.pagerBtn} href={prevHref}>
              ← 이전
            </Link>
          ) : (
            <span className={styles.pagerDisabled}>← 이전</span>
          )}

          <span className={styles.pagerMid}>Page {page}</span>

          {nextHref ? (
            <Link className={styles.pagerBtn} href={nextHref}>
              다음 →
            </Link>
          ) : (
            <span className={styles.pagerDisabled}>다음 →</span>
          )}
        </div>
      </main>
    </div>
  );
}

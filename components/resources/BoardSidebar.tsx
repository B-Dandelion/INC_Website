// components/resources/BoardSidebar.tsx
import Link from "next/link";
import styles from "./resources.module.css";
import type { BoardRow } from "@/lib/resourcesDb";

type TreeNode = {
  name: string;
  fullPath?: string;
  children: Map<string, TreeNode>;
};

function buildHref(basePath: string, params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && v.trim()) sp.set(k, v);
  }
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

function TreeList({
  node,
  boardSlug,
  selectedPath,
  q,
  depth,
}: {
  node: TreeNode;
  boardSlug: string;
  selectedPath?: string;
  q?: string;
  depth: number;
}) {
  const children = [...node.children.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  if (!children.length) return null;

  return (
    <div className={styles.subtree}>
      {children.map((c) => {
        const fullPath = c.fullPath ?? "";
        const active = selectedPath === fullPath;

        return (
          <div key={`${depth}-${c.name}`} className={styles.subtreeItem}>
            <Link
              className={active ? styles.subActive : styles.subLink}
              href={buildHref(`/resources/${boardSlug}`, { path: fullPath, q })}
              style={{ paddingLeft: `${8 + depth * 12}px` }}
              title={fullPath}
            >
              {c.name}
            </Link>

            <TreeList
              node={c}
              boardSlug={boardSlug}
              selectedPath={selectedPath}
              q={q}
              depth={depth + 1}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function BoardSidebar({
  boards,
  activeSlug,
  nestedTree,
  selectedPath,
  q,
}: {
  boards: BoardRow[];
  activeSlug?: string;
  nestedTree?: TreeNode | null;
  selectedPath?: string;
  q?: string;
}) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarTitle}>카테고리</div>

      <nav className={styles.nav}>
        <Link
          href={buildHref("/resources", { q })}
          className={!activeSlug ? styles.navActive : styles.navItem}
        >
          전체 게시물
        </Link>

        {boards.map((b) => {
          const active = b.slug === activeSlug;
          return (
            <div key={b.slug} className={styles.navGroup}>
              <Link
                href={buildHref(`/resources/${b.slug}`, { q })}
                className={active ? styles.navActive : styles.navItem}
              >
                {b.title}
              </Link>

              {active && nestedTree ? (
                <>
                  <Link
                    href={buildHref(`/resources/${b.slug}`, { q })}
                    className={!selectedPath ? styles.subActive : styles.subLink}
                    style={{ paddingLeft: 12 }}
                  >
                    전체
                  </Link>

                  <TreeList
                    node={nestedTree}
                    boardSlug={b.slug}
                    selectedPath={selectedPath}
                    q={q}
                    depth={1}
                  />
                </>
              ) : null}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

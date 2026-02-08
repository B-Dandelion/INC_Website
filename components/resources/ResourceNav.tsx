// components/resources/ResourceNav.tsx
import Link from "next/link";
import styles from "./resources.module.css";
import type { BoardRow } from "@/lib/resourcesDb";
import { isNestedBoard } from "@/lib/resourcesDb";

type TreeNode = {
  name: string;
  fullPath?: string;
  children: Map<string, TreeNode>;
};

function buildHref(base: string, params: Record<string, string | undefined>) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && v.trim()) usp.set(k, v);
  }
  const qs = usp.toString();
  return qs ? `${base}?${qs}` : base;
}

function Tree({
  node,
  baseHref,
  activePath,
  q,
  pageSize,
  depth = 0,
}: {
  node: TreeNode;
  baseHref: string;
  activePath?: string;
  q?: string;
  pageSize?: string;
  depth?: number;
}) {
  const children = [...node.children.values()].sort((a, b) => a.name.localeCompare(b.name));

  if (!children.length) return null;

  return (
    <ul className={styles.tree} style={{ paddingLeft: depth ? 14 : 0 }}>
      {children.map((child) => {
        const isActive = child.fullPath && activePath === child.fullPath;
        const href = child.fullPath
          ? buildHref(baseHref, { path: child.fullPath, q, page: "1", pageSize })
          : baseHref;

        return (
          <li key={`${depth}-${child.name}`} className={styles.treeItem}>
            <Link
              className={`${styles.treeLink} ${isActive ? styles.active : ""}`}
              href={href}
              title={child.fullPath ?? child.name}
            >
              <span className={styles.bullet}>•</span>
              <span className={styles.treeText}>{child.name}</span>
            </Link>

            <Tree
              node={child}
              baseHref={baseHref}
              activePath={activePath}
              q={q}
              pageSize={pageSize}
              depth={depth + 1}
            />
          </li>
        );
      })}
    </ul>
  );
}

export default function ResourceNav({
  boards,
  activeBoardSlug,
  treeRoot,
  q,
  pageSize,
  activePath,
}: {
  boards: BoardRow[];
  activeBoardSlug?: string;
  treeRoot?: TreeNode | null;
  q?: string;
  pageSize?: string;
  activePath?: string;
}) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarTitle}>자료실</div>

      <nav className={styles.nav}>
        <Link className={`${styles.navLink} ${!activeBoardSlug ? styles.active : ""}`} href="/resources">
          전체 게시물
        </Link>

        {boards.map((b) => {
          const isActive = activeBoardSlug === b.slug;
          const href = buildHref(`/resources/${b.slug}`, { q, page: "1", pageSize });

          return (
            <div key={b.id} className={styles.navGroup}>
              <Link className={`${styles.navLink} ${isActive ? styles.active : ""}`} href={href}>
                {b.title}
              </Link>

              {isActive && isNestedBoard(b.slug) && treeRoot ? (
                <div className={styles.subNav}>
                  <Link
                    className={`${styles.subAllLink} ${!activePath ? styles.activeSub : ""}`}
                    href={buildHref(`/resources/${b.slug}`, { q, page: "1", pageSize })}
                  >
                    ▸ 전체
                  </Link>

                  <Tree
                    node={treeRoot}
                    baseHref={`/resources/${b.slug}`}
                    activePath={activePath}
                    q={q}
                    pageSize={pageSize}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

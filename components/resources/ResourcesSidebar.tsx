// components/resources/ResourcesSidebar.tsx
import Link from "next/link";
import styles from "./resources.module.css";
import { BoardRow, buildSourcePathTree, isNestedBoard } from "@/lib/resourcesDb";

function Tree({
  node,
  boardSlug,
  activePath,
  depth = 0,
}: {
  node: { name: string; fullPath?: string; children: Map<string, any> };
  boardSlug: string;
  activePath?: string;
  depth?: number;
}) {
  const items = [...node.children.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <div>
      {items.map((child) => {
        const isActive = !!activePath && child.fullPath === activePath;
        const href = `/resources/${encodeURIComponent(boardSlug)}?path=${encodeURIComponent(
          child.fullPath ?? ""
        )}`;

        return (
          <div key={child.fullPath ?? child.name}>
            <Link
              className={`${styles.subLink} ${isActive ? styles.active : ""}`}
              href={href}
              style={{ paddingLeft: 10 + depth * 14 }}
            >
              <span className={styles.bullet}>•</span>
              <span className={styles.subText}>{child.name}</span>
            </Link>
            {child.children?.size ? (
              <Tree
                node={child}
                boardSlug={boardSlug}
                activePath={activePath}
                depth={depth + 1}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default function ResourcesSidebar({
  boards,
  activeBoardSlug,
  nestedSourcePaths = [],
  activePath,
}: {
  boards: BoardRow[];
  activeBoardSlug?: string;
  nestedSourcePaths?: string[];
  activePath?: string;
}) {
  const activeBoard = boards.find((b) => b.slug === activeBoardSlug);

  const tree =
    activeBoardSlug && isNestedBoard(activeBoardSlug)
      ? buildSourcePathTree(activeBoardSlug, nestedSourcePaths)
      : null;

  return (
    <div>
      <div className={styles.navTitle}>카테고리</div>

      <Link
        className={`${styles.navLink} ${
          !activeBoardSlug ? styles.active : ""
        }`}
        href="/resources"
      >
        전체 게시물
      </Link>

      <div className={styles.divider} />

      {boards.map((b) => {
        const isActive = b.slug === activeBoardSlug;
        return (
          <div key={b.slug}>
            <Link
              className={`${styles.navLink} ${isActive ? styles.active : ""}`}
              href={`/resources/${encodeURIComponent(b.slug)}`}
            >
              {b.title}
            </Link>

            {/* 하위 카테고리(3개만) */}
            {isActive && tree && tree.children.size > 0 ? (
              <div className={styles.subTree}>
                <Tree
                  node={tree as any}
                  boardSlug={b.slug}
                  activePath={activePath}
                />
              </div>
            ) : null}
          </div>
        );
      })}

      {activeBoard ? (
        <div className={styles.sideHint}>
          <div className={styles.hintTitle}>선택됨</div>
          <div className={styles.hintBody}>{activeBoard.title}</div>
        </div>
      ) : null}
    </div>
  );
}

// components/resources/SubTreeNav.tsx
import Link from "next/link";
import styles from "./SubTreeNav.module.css";

type Node = { name: string; fullPath?: string; children: Map<string, Node> };

function renderNode(boardSlug: string, node: Node) {
  const children = [...node.children.values()];
  return (
    <ul className={styles.ul}>
      {children.map((c) => (
        <li key={c.fullPath ?? c.name} className={styles.li}>
          {c.fullPath ? (
            <Link
              className={styles.link}
              href={`/resources/${encodeURIComponent(boardSlug)}?path=${encodeURIComponent(c.fullPath)}`}
            >
              <span className={styles.bullet}>•</span>
              <span className={styles.text}>{c.name}</span>
            </Link>
          ) : (
            <div className={styles.label}>{c.name}</div>
          )}
          {c.children.size > 0 ? renderNode(boardSlug, c) : null}
        </li>
      ))}
    </ul>
  );
}

export default function SubTreeNav({
  boardSlug,
  tree,
  title = "세부 분류",
}: {
  boardSlug: string;
  tree: Node;
  title?: string;
}) {
  return (
    <div className={styles.wrap}>
      <div className={styles.title}>{title}</div>
      {renderNode(boardSlug, tree)}
    </div>
  );
}

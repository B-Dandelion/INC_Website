// components/resources/ResourcesShell.tsx
import styles from "./resources.module.css";

export default function ResourcesShell({
  sidebar,
  children,
  title,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h1 className={styles.h1}>{title ?? "자료실"}</h1>
      </div>

      <div className={styles.shell}>
        <aside className={styles.sidebar}>{sidebar}</aside>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}

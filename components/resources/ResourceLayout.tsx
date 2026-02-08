// components/resources/ResourceLayout.tsx
import styles from "./ResourceLayout.module.css";

export default function ResourceLayout({
  left,
  right,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <div className={styles.wrap}>
      <aside className={styles.left}>{left}</aside>
      <main className={styles.right}>{right}</main>
    </div>
  );
}

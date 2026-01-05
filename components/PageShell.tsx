import styles from "./PageShell.module.css";

type Props = {
  title: string;
  description?: string;
  children?: React.ReactNode;
};

export default function PageShell({ title, description, children }: Props) {
  return (
    <main className={styles.main}>
      <div className={styles.inner}>
        <h1 className={styles.title}>{title}</h1>
        {description ? <p className={styles.desc}>{description}</p> : null}
        {children ? <div className={styles.content}>{children}</div> : null}
      </div>
    </main>
  );
}

import Link from "next/link";
import styles from "./Hero.module.css";

type Props = {
  title?: string;
  subtitle?: string;
};

export default function Hero({
  title = "INC",
  subtitle = "한국 원자력 연구 및 국제 협력 네트워크를 이끄는 INC 공식 홈페이지입니다.",
}: Props) {
  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        <p className={styles.kicker}>International Nuclear Cooperation</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>

        <div className={styles.actions}>
          <Link className={styles.primaryBtn} href="/news">
            공지사항
          </Link>
          <Link className={styles.secondaryBtn} href="/resources">
            자료실
          </Link>
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import styles from "./ContactSection.module.css";
import type { ContactInfo } from "@/lib/homeData";

type Props = {
  info: ContactInfo;
};

export default function ContactSection({ info }: Props) {
  const mailto = `mailto:${info.email}`;
  const webmasterMailto = `mailto:${info.webmasterEmail}`;

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <h2 className={styles.heading}>Contact</h2>
          <p className={styles.subheading}>문의 및 연락처 정보를 안내합니다.</p>
        </div>

        <div className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.label}>기관</div>
            <div className={styles.value}>{info.orgName}</div>

            <div className={styles.row}>
              <div className={styles.label}>주소</div>
              <div className={styles.valueMuted}>{info.address}</div>
            </div>

            <div className={styles.row}>
              <div className={styles.label}>대표전화</div>
              <div className={styles.valueMuted}>{info.phone}</div>
            </div>

            <div className={styles.actions}>
              <a className={styles.primaryBtn} href={mailto}>
                이메일 문의
              </a>
              <Link className={styles.secondaryBtn} href="/contact">
                문의 페이지
              </Link>
            </div>
          </div>

          <div className={styles.cardAlt}>
            <div className={styles.altTitle}>운영 안내</div>
            <p className={styles.altDesc}>
              공지 및 자료 업데이트는 내부 승인 절차 후 게시됩니다. 급한 문의는 대표메일로
              전달해 주세요.
            </p>

            <div className={styles.altBox}>
              <div className={styles.altLabel}>Webmaster</div>
              <a className={styles.altLink} href={webmasterMailto}>
                {info.webmasterEmail}
              </a>
            </div>

            <div className={styles.altBox}>
              <div className={styles.altLabel}>관련 링크</div>
              <Link className={styles.altLink} href="/news">
                공지사항
              </Link>
              <span className={styles.sep}>·</span>
              <Link className={styles.altLink} href="/resources">
                자료실
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

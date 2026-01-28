import Link from "next/link";
import Image from "next/image";
import styles from "./Footer.module.css";

type PolicyLink = { label: string; href: string };

type FooterContact = {
  addressLines?: string[];
  phone?: string;
  email?: string;
};

export default function Footer({
  policyLinks,
  orgName,
  contact,
}: {
  policyLinks: PolicyLink[];
  orgName: string;
  contact?: FooterContact;
}) {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      {/* TOP */}
      <div className={styles.top}>
        <div className={styles.container}>
          {/* 브랜드/연락처 */}
          <div className={styles.brandCol}>
            <div className={styles.brandRow}>
              <div className="relative h-14 w-14 rounded-full overflow-hidden bg-white/10 ring-1 ring-white/15">
                <Image
                  src="/inc_mini_logo.png"
                  alt={`${orgName} logo`}
                  fill
                  className={styles.logoImg}
                  priority
                />
              </div>

              {/* 로고만으로 충분하면 아래 텍스트는 지워도 됨 */}
              <div className={styles.brandText}>
                <div className={styles.brandName}>{orgName}</div>
                <div className={styles.brandSub}>All rights reserved.</div>
              </div>
            </div>

            <div className={styles.contact}>
              {contact?.addressLines?.length ? (
                <div className={styles.contactLine}>
                  {contact.addressLines.join(" · ")}
                </div>
              ) : null}

              {contact?.phone ? (
                <div className={styles.contactLine}>Tel: {contact.phone}</div>
              ) : null}

              {contact?.email ? (
                <a className={styles.contactEmail} href={`mailto:${contact.email}`}>
                  {contact.email}
                </a>
              ) : null}
            </div>
          </div>

          {/* 컬럼 */}
          <div className={styles.cols}>
            <div className={styles.col}>
              <div className={styles.colTitle}>Resources</div>
              <Link className={styles.colLink} href="/resources">자료실</Link>
              <Link className={styles.colLink} href="/contact">문의</Link>
            </div>

            <div className={styles.col}>
              <div className={styles.colTitle}>Policies</div>
              {policyLinks.map((x) => (
                <Link key={x.href} className={styles.colLink} href={x.href}>
                  {x.label}
                </Link>
              ))}
            </div>

            <div className={styles.col}>
              <div className={styles.colTitle}>Stay in Touch</div>
              <div className={styles.miniText}>
                공지 및 자료 업데이트는 내부 승인 절차 후 게시됩니다.
                <br />
                급한 문의는 대표메일로 전달해주세요.
              </div>

              {contact?.email ? (
                <a className={styles.primaryBtn} href={`mailto:${contact.email}`}>
                  이메일 문의
                </a>
              ) : (
                <Link className={styles.primaryBtn} href="/contact">
                  문의 페이지
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM */}
      <div className={styles.bottom}>
        <div className={styles.containerBottom}>
          <div className={styles.bottomLeft}>
            © {year} {orgName}. All rights reserved.
          </div>

          <div className={styles.bottomRight}>
            {policyLinks.slice(0, 4).map((x) => (
              <Link key={x.href} className={styles.bottomLink} href={x.href}>
                {x.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
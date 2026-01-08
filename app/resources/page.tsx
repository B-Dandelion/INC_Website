import Link from "next/link";
import PageShell from "@/components/PageShell";
import styles from "./resources.module.css";

const cards = [
  { href: "/resources/publications", title: "발간물", desc: "ATM / Heartbeat of Atoms" },
  { href: "/resources/awards", title: "수상작", desc: "에세이 행사 소개 포스트(국/영) + 사진" },
  { href: "/resources/shortform", title: "숏폼", desc: "숏폼 에세이 자료" },
  { href: "/resources/reports", title: "보고서", desc: "수신 보고서 PDF 아카이브" },
  { href: "/resources/meetings", title: "달개비 회의", desc: "소개문 / 발표자료 / 사진" },
  { href: "/resources/events", title: "기타 행사", desc: "행사별 자료 모음" },
];

export default function ResourcesPage() {
  return (
    <PageShell
      title="Resources"
      description="웹 업로드 대상 자료를 카테고리별로 정리합니다."
    >
      <div className={styles.grid}>
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className={styles.card}>
            <div className={styles.cardTitle}>{c.title}</div>
            <div className={styles.cardDesc}>{c.desc}</div>
          </Link>
        ))}
      </div>

      <div className={styles.notice}>
        ⚠️ 이력서/개인 사진은 공개 업로드 전에 반드시 범위(공개/내부)를 확정해야 합니다.
      </div>
    </PageShell>
  );
}
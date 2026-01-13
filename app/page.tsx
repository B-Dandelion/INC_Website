// app/page.tsx
import Link from "next/link";
import styles from "./page.module.css";
import { RESOURCE_BOARDS } from "@/lib/resourceBoards";
import { fetchPublicResources } from "@/lib/resourcesDb";

function kindLabel(kind: string) {
  switch (kind) {
    case "pdf": return "PDF";
    case "image": return "IMG";
    case "video": return "VIDEO";
    case "doc": return "DOC";
    case "zip": return "ZIP";
    default: return "LINK";
  }
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }> | { q?: string };
}) {
  const sp = searchParams ? await Promise.resolve(searchParams) : {};
  const q = (sp.q ?? "").trim();

  const latest = await fetchPublicResources({ limit: 10 });

  return (
    <main className={styles.main}>
      <div className={styles.inner}>
        {/* Hero */}
        <section className={styles.hero}>
          <h1 className={styles.title}>자료실</h1>
          <p className={styles.desc}>
            자료를 업로드하고 열람/다운로드할 수 있습니다. 카테고리별로 빠르게 찾아보세요.
          </p>

          {/* 검색(일단 이동만) */}
          <form action="/resources" method="get" className={styles.search}>
            <input
              name="q"
              defaultValue={q}
              placeholder="제목/키워드로 검색"
              className={styles.searchInput}
            />
            <button type="submit" className={styles.searchBtn}>
              검색
            </button>
          </form>

          <div className={styles.heroActions}>
            <Link className={styles.primaryBtn} href="/resources">
              자료실 전체 보기
            </Link>
          </div>
        </section>

        {/* 카테고리 */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>카테고리</h2>
            <span className={styles.sectionHint}>11개 항목은 모두 동일 등급입니다.</span>
          </div>

          <div className={styles.grid}>
            {RESOURCE_BOARDS.map((b) => (
              <Link
                key={b.slug}
                href={`/resources?cat=${b.slug}`}
                className={styles.card}
              >
                <div className={styles.cardTitle}>{b.label}</div>
                <div className={styles.cardMeta}>바로가기</div>
              </Link>
            ))}
          </div>
        </section>

        {/* 최근 업로드 */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>최근 업로드</h2>
            <Link className={styles.moreLink} href="/resources">
              더 보기 →
            </Link>
          </div>

          {latest.length === 0 ? (
            <div className={styles.empty}>아직 등록된 자료가 없습니다.</div>
          ) : (
            <div className={styles.latestBox}>
              <div className={styles.latestHead}>
                <span>종류</span>
                <span>제목</span>
                <span>날짜</span>
              </div>

              {latest.map((r) => (
                <Link
                  key={r.id}
                  href="/resources"
                  className={styles.latestRow}
                  title="자료실에서 확인"
                >
                  <span className={styles.badge}>{kindLabel(r.kind)}</span>
                  <span className={styles.latestTitle}>{r.title}</span>
                  <span className={styles.latestDate}>
                    {(r.published_at ?? "").toString() || "-"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
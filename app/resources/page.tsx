// app/resources/page.tsx
import Link from "next/link";
import styles from "./resources.module.css";
import ResourceList, { type ResourceItem } from "@/components/resources/ResourceList";
import { RESOURCE_BOARDS } from "@/lib/resourceBoards";
import { fetchPublicResources } from "@/lib/resourcesDb";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams?: Promise<{ cat?: string }> | { cat?: string };
}) {
  const sp = searchParams ? await Promise.resolve(searchParams) : {};
  const cat = (sp.cat ?? "").trim();

  const selected = RESOURCE_BOARDS.find((x) => x.slug === cat) ?? null;

  const rows = await fetchPublicResources({
    limit: 200,
    boardSlug: selected?.slug ?? "",
  });

  const showCategory = !selected;

  const items: ResourceItem[] = rows.map((r: any) => ({
    id: r.id,
    title: r.title,
    kind: r.kind,
    note: r.note ?? undefined,
    date: (r.published_at ?? r.created_at?.slice?.(0, 10) ?? "—") as string,
    visibility: r.visibility,
    canView: true,
    canDownload: !!r.r2_key,
    boardSlug: r.boards?.slug ?? "",
    boardTitle: r.boards?.title ?? "",
  }));

  <ResourceList items={items} showCategory={showCategory} />

  return (
    <main className={styles.main}>
      <div className={styles.inner}>
        {/* Hero (홈과 동일 톤) */}
        <section className={styles.hero}>
          <h1 className={styles.title}>자료실</h1>
          <p className={styles.desc}>
            전체 자료를 확인할 수 있습니다. 카테고리별로 빠르게 찾아보세요.
          </p>

          <div className={styles.heroActions}>
            <Link className={styles.primaryBtn} href="/resources">
              전체 보기
            </Link>
            {selected ? (
              <span className={styles.pill}>
                선택된 카테고리: <b>{selected.label}</b>
              </span>
            ) : (
              <span className={styles.pill}>선택된 카테고리: <b>전체</b></span>
            )}
          </div>
        </section>

        {/* 카테고리 + 리스트 */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>카테고리</h2>
            <Link className={styles.moreLink} href="/resources">
              전체 보기 →
            </Link>
          </div>

          <div className={styles.chips}>
            <Link
              href="/resources"
              className={`${styles.chip} ${!selected ? styles.chipActive : ""}`}
              aria-current={!selected ? "page" : undefined}
            >
              전체
            </Link>

            {RESOURCE_BOARDS.map((b) => {
              const active = selected?.slug === b.slug;
              return (
                <Link
                  key={b.slug}
                  href={`/resources?cat=${b.slug}`}
                  className={`${styles.chip} ${active ? styles.chipActive : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  {b.label}
                </Link>
              );
            })}
          </div>

          <div className={styles.listWrap}>
            <ResourceList items={items} emptyText="해당 카테고리에 등록된 자료가 없습니다." />
          </div>
        </section>
      </div>
    </main>
  );
}
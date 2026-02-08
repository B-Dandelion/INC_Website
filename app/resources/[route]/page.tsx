// app/resources/[route]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "../resources.module.css";
import ResourceList, { type ResourceItem } from "@/components/resources/ResourceList";
import { RESOURCE_BOARDS } from "@/lib/resourceBoards";
import { fetchPublicResources } from "@/lib/resourcesDb";
import { boardSlugToRoute, routeToBoardSlug } from "@/lib/routeMaps";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ResourceBoardPage({
  params,
}: {
  params: { route: string };
}) {
  const route = decodeURIComponent(params.route);
  const boardSlug = routeToBoardSlug[route] ?? route;

  const selected = RESOURCE_BOARDS.find((x) => x.slug === boardSlug) ?? null;
  if (!selected) return notFound();

  const rows = await fetchPublicResources({
    limit: 200,
    boardSlug,
  });

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

  return (
    <main className={styles.main}>
      <div className={styles.inner}>
        <section className={styles.hero}>
          <h1 className={styles.title}>자료실</h1>
          <p className={styles.desc}>카테고리별 자료를 확인할 수 있습니다.</p>

          <div className={styles.heroActions}>
            <Link className={styles.primaryBtn} href="/resources">
              전체 보기
            </Link>
            <span className={styles.pill}>
              선택된 카테고리: <b>{selected.label}</b>
            </span>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>카테고리</h2>
            <Link className={styles.moreLink} href="/resources">
              전체 보기 →
            </Link>
          </div>

          <div className={styles.chips}>
            <Link href="/resources" className={styles.chip}>
              전체
            </Link>

            {RESOURCE_BOARDS.map((b) => {
              const active = selected.slug === b.slug;
              const href = `/resources/${boardSlugToRoute[b.slug] ?? b.slug}`;
              return (
                <Link
                  key={b.slug}
                  href={href}
                  className={`${styles.chip} ${active ? styles.chipActive : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  {b.label}
                </Link>
              );
            })}
          </div>

          <div className={styles.listWrap}>
            <ResourceList
              items={items}
              showCategory={false}
              emptyText="해당 카테고리에 등록된 자료가 없습니다."
            />
          </div>
        </section>
      </div>
    </main>
  );
}
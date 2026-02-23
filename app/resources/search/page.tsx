// app/resources/search/page.tsx
import ResourcesFrame from "@/components/resources/ResourcesFrame";
import SearchResultList from "@/components/resources/SearchResultList";
import ResourceBoard, { type BoardItem } from "@/components/resources/ResourceBoard";
import styles from "@/components/resources/SimpleListPage.module.css";
import { fetchResources } from "@/lib/resourcesDb";

export default async function ResourceSearchPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; page?: string }>;
}) {
    const sp = await searchParams;
    const q = typeof sp.q === "string" ? sp.q.trim() : "";
    const page = Math.max(1, Number(sp.page ?? "1") || 1);

    const pageSize = 50;
    const rows = await fetchResources({
        q: q || undefined,
        page,
        pageSize,
    });

    const items: BoardItem[] = rows.map((r: any) => {
        const titleText = ((r.title ?? "").trim() || r.original_filename || "자료").toString();
        const boardName = r.boards?.title ?? r.boards?.slug ?? "카테고리";
        const metaLine = `카테고리 ${boardName} · 게시 ${r.posted_at ?? "-"} · 조회 ${r.views_count ?? 0}`;
        const base = (r.note ?? r.original_filename ?? "").toString();
        const subText = base ? `${base} · ${metaLine}` : metaLine;

        return { id: r.id, title: titleText, subtitle: subText, rightMeta: "" };
    });



    const hasPrev = page > 1;
    const hasNext = rows.length === pageSize;

    const prevHref = `/resources/search?q=${encodeURIComponent(q)}&page=${page - 1}`;
    const nextHref = `/resources/search?q=${encodeURIComponent(q)}&page=${page + 1}`;

    const listRows = rows.map((r: any) => {
        const titleText = ((r.title ?? "").trim() || r.original_filename || "자료").toString();
        const boardName = r.boards?.title ?? r.boards?.slug ?? "카테고리";
        const metaLine = `카테고리 ${boardName} · 게시 ${r.posted_at ?? "-"} · 조회 ${r.views_count ?? 0}`;
        const base = (r.note ?? r.original_filename ?? "").toString();
        const subText = base ? `${base} · ${metaLine}` : metaLine;

        return { id: r.id, title: titleText, subtitle: subText, kind: r.kind };
    });

    return (
        <ResourcesFrame activeKey={"atm" as any /* active 표시 굳이 안 맞춰도 됨 */}>
            <div className={styles.content}>
                <div className={styles.hero}>
                    <h1 className={styles.h1}>검색 결과</h1>
                    <div className={styles.meta}>
                        {q ? `“${q}” 검색 결과` : "검색어를 입력하세요."}
                    </div>
                </div>

                {q ? (
                    listRows.length === 0 ? (
                        <div className={styles.card}>
                            <div className={styles.muted}>검색 결과가 없습니다.</div>
                        </div>
                    ) : (
                        <SearchResultList rows={listRows} />
                    )
                ) : (
                    <div className={styles.card}>
                        <div className={styles.muted}>상단 검색창에 검색어를 입력하고 Enter를 누르세요.</div>
                    </div>
                )}

                {q ? (
                    <div className={styles.pager}>
                        {hasPrev ? (
                            <a className={styles.pagerBtn} href={prevHref} aria-label="이전" title="이전">
                                ‹
                            </a>
                        ) : (
                            <span className={styles.pagerBtn} style={{ visibility: "hidden" }}>
                                ‹
                            </span>
                        )}
                        {hasNext ? (
                            <a className={styles.pagerBtn} href={nextHref} aria-label="다음" title="다음">
                                ›
                            </a>
                        ) : (
                            <span className={styles.pagerBtn} style={{ visibility: "hidden" }}>
                                ›
                            </span>
                        )}
                    </div>
                ) : null}
            </div>
        </ResourcesFrame>
    );
}
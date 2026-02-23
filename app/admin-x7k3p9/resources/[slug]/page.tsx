import ResourcesFrame, { NAV } from "@/components/resources/AdminResourcesFrame";
import styles from "@/components/resources/SimpleListPage.module.css";
import { fetchResources } from "@/lib/resourcesDb";
import AdminResourceBoard from "@/components/resources/AdminResourceBoard";

function guessIssue(title: string) {
    const m = title.match(/\bNo\.?\s*(\d{1,4})\b/i);
    return m ? `No. ${m[1]}` : "";
}

const ISSUE_BOARDS = new Set(["atm", "heartbeat-of-atoms"]);

export default async function AdminBoardPage({
    params,
    searchParams,
}: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ page?: string }>;
}) {
    const { slug } = await params;
    const sp = await searchParams;
    const page = Math.max(1, Number(sp.page ?? "1") || 1);

    const pageSize = 50;
    const rows = await fetchResources({ boardSlug: slug, page, pageSize });

    const boardLabel = NAV.find((x) => x.key === (slug as any))?.label ?? slug;

    const hasPrev = page > 1;
    const hasNext = rows.length === pageSize;

    const items = (rows ?? []).map((r: any) => {
        const titleText = ((r.title ?? "").trim() || r.original_filename || "자료").toString();
        const metaLine = `게시 ${r.posted_at ?? "-"} · 조회 ${r.views_count ?? 0}`;
        const base = (r.note ?? r.original_filename ?? "").toString();
        const subText = base ? `${base} · ${metaLine}` : metaLine;

        return {
            id: r.id,
            title: titleText,
            subtitle: subText,
            rightMeta: ISSUE_BOARDS.has(slug) ? guessIssue(titleText) : "",
            _raw: r,
        };
    });

    return (
        <ResourcesFrame activeKey={slug as any}>
            <div className={styles.content}>
                <div
                    className={styles.hero}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12 }}
                >
                    <div>
                        <h1 className={styles.h1}>관리: {boardLabel}</h1>
                        <div className={styles.meta}>행 클릭이 아니라, 오른쪽 버튼으로 수정/삭제/교체 하세요.</div>
                    </div>

                    <a
                        href={`/admin-x7k3p9/resources/${slug}/upload`}
                        style={{
                            border: "1px solid #ddd",
                            borderRadius: 10,
                            padding: "10px 12px",
                            textDecoration: "none",
                        }}
                    >
                        + 업로드
                    </a>
                </div>

                {items.length === 0 ? (
                    <div className={styles.card}>
                        <div className={styles.muted}>등록된 자료가 없습니다.</div>
                    </div>
                ) : (
                    <AdminResourceBoard items={items as any} boardSlug={slug} />
                )}

                <div className={styles.pager}>
                    {hasPrev ? (
                        <a
                            className={styles.pagerBtn}
                            href={`/admin-x7k3p9/resources/${slug}?page=${page - 1}`}
                            aria-label="이전"
                            title="이전"
                        >
                            ‹
                        </a>
                    ) : (
                        <span className={styles.pagerBtn} style={{ visibility: "hidden" }}>
                            ‹
                        </span>
                    )}

                    {hasNext ? (
                        <a
                            className={styles.pagerBtn}
                            href={`/admin-x7k3p9/resources/${slug}?page=${page + 1}`}
                            aria-label="다음"
                            title="다음"
                        >
                            ›
                        </a>
                    ) : (
                        <span className={styles.pagerBtn} style={{ visibility: "hidden" }}>
                            ›
                        </span>
                    )}
                </div>
            </div>
        </ResourcesFrame>
    );
}
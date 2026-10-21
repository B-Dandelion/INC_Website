"use client";

// One registered asset row. Defined at module level so React keeps the same
// component type across parent renders instead of remounting every row.
import type { EventAssetRow } from "@/lib/eventsDb";
import styles from "@/components/resources/SimpleListPage.module.css";
import { handleUnauthorized, youtubeVideoId, canonicalYoutubeUrl, isImageLike, isVideoLike, fileAcceptForRole, miniBtnStyle } from "./helpers";

function Thumb({
    rid,
    mime,
    filename,
}: {
    rid: number;
    mime: string | null;
    filename: string | null;
}) {
    // Admin previews must not count as public views.
    const thumb = isImageLike(mime, filename) ? `/api/resources/media?id=${rid}&w=320` : `/api/resources/media?id=${rid}`;

    if (isImageLike(mime, filename)) {
        return (
            <img
                src={thumb}
                alt=""
                style={{
                    width: 56,
                    height: 56,
                    objectFit: "cover",
                    borderRadius: 12,
                    border: "1px solid #eee",
                    flex: "0 0 auto",
                }}
            />
        );
    }

    if (isVideoLike(mime, filename)) {
        return (
            <video
                src={thumb}
                muted
                playsInline
                preload="metadata"
                style={{
                    width: 56,
                    height: 56,
                    objectFit: "cover",
                    borderRadius: 12,
                    border: "1px solid #eee",
                    flex: "0 0 auto",
                }}
            />
        );
    }

    return null;
}

export default function AssetRow({ asset, slug }: { asset: EventAssetRow; slug: string }) {
    async function replaceResource(resourceId: number) {
        const input = document.createElement("input");
        input.type = "file";

        const accept = fileAcceptForRole(asset.role, slug);
        if (accept) input.accept = accept;

        input.onchange = async () => {
            const selectedFile = input.files?.[0];
            if (!selectedFile) return;

            const formData = new FormData();
            formData.set("resourceId", String(resourceId));
            formData.set("file", selectedFile);

            const response = await fetch(
                "/api/admin/resources/replace",
                {
                    method: "POST",
                    body: formData,
                }
            );

            if (handleUnauthorized(response)) return;

        if (!response.ok) {
                alert(await response.text());
                return;
            }

            location.reload();
        };

        input.click();
    }

    async function updateYoutubeResource(
        resourceId: number,
        currentUrl: string
    ) {
        const nextValue = prompt(
            "새 유튜브 링크를 입력하세요.",
            currentUrl
        );

        if (nextValue == null) return;

        const normalized = canonicalYoutubeUrl(nextValue);

        if (!normalized) {
            alert("올바른 유튜브 링크를 입력하세요.");
            return;
        }

        const response = await fetch(
            "/api/admin/resources/update",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    resourceId,
                    source_path: normalized,
                }),
            }
        );

        if (handleUnauthorized(response)) return;

        if (!response.ok) {
            alert(await response.text());
            return;
        }

        location.reload();
    }

    async function deleteResource(resourceId: number) {
        const confirmed = confirm(
            "이 자료를 행사에서 제거하고 파일도 숨김 처리할까요?"
        );

        if (!confirmed) return;

        // event_assets 연결을 먼저 제거해야 포스터 재업로드 시
        // 행사별 1개 제한(unique index)에 걸리지 않습니다.
        const unlinkResponse = await fetch(
            "/api/admin/event-assets/remove",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: asset.id }),
            }
        );

        if (handleUnauthorized(unlinkResponse)) return;

        if (!unlinkResponse.ok) {
            alert(await unlinkResponse.text());
            return;
        }

        const deleteResponse = await fetch(
            "/api/admin/resources/delete",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ resourceId }),
            }
        );

        if (handleUnauthorized(deleteResponse)) return;

        if (!deleteResponse.ok) {
            alert(
                "행사 연결은 제거됐지만 파일 숨김 처리에 실패했습니다.\n" +
                (await deleteResponse.text())
            );
            return;
        }

        location.reload();
    }

    const rid = asset.resources?.id ?? null;
    const mime = asset.resources?.mime ?? null;
    const filename = asset.resources?.original_filename ?? null;
    const sourcePath = asset.resources?.source_path?.trim() ?? "";
    const sourceYoutubeId = youtubeVideoId(sourcePath);
    const title =
        asset.resources?.title ??
        asset.resources?.original_filename ??
        `resource ${rid ?? "-"}`;
    const itemTitle =
        asset.item_title_ko ?? asset.item_title_en ?? null;
    const person =
        asset.person_ko ?? asset.person_en ?? null;
    const href = sourcePath || (rid ? `/api/resources/go?id=${rid}` : "#");

    return (
        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                padding: 12,
                borderRadius: 14,
                border: "1px solid rgba(37,99,235,0.18)",
                background: "#fff",
            }}
        >
            <div
                style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    minWidth: 0,
                }}
            >
                {sourceYoutubeId ? (
                    <img
                        src={`https://i.ytimg.com/vi/${sourceYoutubeId}/hqdefault.jpg`}
                        alt=""
                        style={{
                            width: 96,
                            height: 56,
                            objectFit: "cover",
                            borderRadius: 12,
                            border: "1px solid #eee",
                            flex: "0 0 auto",
                        }}
                    />
                ) : rid ? (
                    <Thumb
                        rid={rid}
                        mime={mime}
                        filename={filename}
                    />
                ) : null}

                <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900 }}>{title}</div>

                    {itemTitle ? (
                        <div style={{ fontSize: 13 }}>
                            작품명: {itemTitle}
                        </div>
                    ) : null}

                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                        {person ? `인물: ${person}` : ""}
                        {asset.award
                            ? `${person ? " · " : ""}수상: ${asset.award}`
                            : ""}
                        {` · 순서: ${asset.sort_order ?? 0}`}
                    </div>
                </div>
            </div>

            <div
                style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                }}
            >
                {rid ? (
                    <>
                        <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.pagerBtn}
                            style={miniBtnStyle}
                        >
                            {sourcePath ? "유튜브 열기" : "열기"}
                        </a>

                        {sourcePath ? (
                            <button
                                type="button"
                                onClick={() =>
                                    updateYoutubeResource(
                                        rid,
                                        sourcePath
                                    )
                                }
                                className={styles.pagerBtn}
                                style={miniBtnStyle}
                            >
                                링크 수정
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => replaceResource(rid)}
                                className={styles.pagerBtn}
                                style={miniBtnStyle}
                            >
                                교체
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => deleteResource(rid)}
                            className={styles.pagerBtn}
                            style={{
                                ...miniBtnStyle,
                                borderColor: "#ffb3b3",
                            }}
                        >
                            삭제
                        </button>
                    </>
                ) : null}
            </div>
        </div>
    );
}

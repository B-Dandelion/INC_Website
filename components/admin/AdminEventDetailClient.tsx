"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/components/resources/SimpleListPage.module.css";
import type { EventAssetRow } from "@/lib/eventsDb";

export type AdminEvent = {
    id: string;
    category: string;
    subtype: string | null;
    series_year: number | null;
    title_ko: string;
    title_en: string | null;
    event_date: string | null;
    period_end: string | null;
    visibility: string;
    location_ko: string | null;
    location_en: string | null;
    start_time: string | null;
    end_time: string | null;
};

type Asset = EventAssetRow;

import AssetRow from "./eventDetail/AssetRow";
import { EVENT_ROLE_OPTIONS, CONTEST_SLUGS, SEMINAR_SECTIONS, FALLBACK_ROLE_LABELS } from "./eventDetail/constants";
import { trimOrNull, handleUnauthorized, canonicalYoutubeUrl, fileAcceptForRole } from "./eventDetail/helpers";
import { errorMessage } from "@/lib/errors";
import { slotFor } from "@/lib/boardRules";
import { Trash2 } from "lucide-react";
import { Button, Card } from "./ui";
import { useConfirm } from "./ui/ConfirmDialog";
import { useToast } from "./ui/Toast";

export default function AdminEventDetailClient({
    slug,
    event,
    assets,
}: {
    slug: string;
    event: AdminEvent;
    assets: Asset[];
}) {
    const [busy, setBusy] = useState(false);
    const confirmDialog = useConfirm();
    const toast = useToast();
    const router = useRouter();

    // 행사 기본 정보
    const [titleKo, setTitleKo] = useState(event.title_ko ?? "");
    const [eventDate, setEventDate] = useState(event.event_date ?? "");
    const [periodEnd, setPeriodEnd] = useState(event.period_end ?? "");

    // 공통 업로드 정보
    const [roleToAdd, setRoleToAdd] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [uploadMode, setUploadMode] = useState<"file" | "youtube">("file");
    const [youtubeUrl, setYoutubeUrl] = useState("");
    const [resTitle, setResTitle] = useState("");
    const [note, setNote] = useState("");
    const [sortOrder, setSortOrder] = useState("0");
    const [err, setErr] = useState<string | null>(null);

    // 공모전 전용 event_assets 메타데이터
    const [personKo, setPersonKo] = useState("");
    const [personEn, setPersonEn] = useState("");
    const [itemTitleKo, setItemTitleKo] = useState("");
    const [itemTitleEn, setItemTitleEn] = useState("");
    const [award, setAward] = useState("");

    const isContest = CONTEST_SLUGS.has(slug);
    const isSeminar = slug === "seminar";
    const seminarKind = event.subtype === "international" ? "국제" : "국내";

    // 공모전이어도 해당 role을 선택한 경우에만 전용 필드를 노출합니다.
    const isAwardDoc = isContest && roleToAdd === "award_doc";
    const isWinnerPhoto = isContest && roleToAdd === "winner_photo";
    const isContestSubmission = isContest && roleToAdd === "slide";
    const supportsYoutube = isAwardDoc || isContestSubmission;
    const isYoutubeMode = supportsYoutube && uploadMode === "youtube";
    const usesPersonMetadata = isAwardDoc || isWinnerPhoto || isContestSubmission;

    const configuredRoleOptions = EVENT_ROLE_OPTIONS[slug] ?? [];
    const configuredRoles = configuredRoleOptions.map((option) => option.role);
    const configuredRoleLabels = new Map(
        configuredRoleOptions.map((option) => [option.role, option.label])
    );

    const existingRoles = useMemo(() => {
        const set = new Set<string>();
        for (const asset of assets) {
            if (asset.role) set.add(asset.role);
        }
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [assets]);

    const grouped = useMemo(() => {
        const map = new Map<string, Asset[]>();

        for (const asset of assets) {
            const key = asset.role || "unknown";
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(asset);
        }

        for (const [, list] of map) {
            list.sort(
                (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
            );
        }

        return map;
    }, [assets]);

    /**
     * 신규 행사에서는 configuredRoles로 선택지를 만들고,
     * 예전에 저장된 알 수 없는 role이 있다면 existingRoles로 보존합니다.
     */
    const selectableRoles = Array.from(
        new Set([...configuredRoles, ...existingRoles])
    );

    const orderedRoles = [
        ...configuredRoles.filter((role) => grouped.has(role)),
        ...Array.from(grouped.keys())
            .filter((role) => !configuredRoles.includes(role))
            .sort((a, b) => a.localeCompare(b)),
    ];

    function roleLabel(role: string) {
        return (
            configuredRoleLabels.get(role) ??
            FALLBACK_ROLE_LABELS[role] ??
            role
        );
    }

    async function saveEventMeta() {
        setErr(null);

        if (!titleKo.trim()) {
            setErr("행사명은 비워둘 수 없습니다.");
            return;
        }

        if (eventDate && periodEnd && periodEnd < eventDate) {
            setErr("기간 종료일은 행사일보다 빠를 수 없습니다.");
            return;
        }

        setBusy(true);

        try {
            const patch = {
                title_ko: titleKo.trim(),
                event_date: eventDate || null,
                period_end: periodEnd || null,
            };

            const response = await fetch("/api/admin/events/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: event.id, patch }),
            });

            if (handleUnauthorized(response)) return;

            if (!response.ok) {
                setErr(await response.text());
                return;
            }

            location.reload();
        } catch (error) {
            setErr(errorMessage(error));
        } finally {
            setBusy(false);
        }
    }

    async function deleteEvent() {
        const ok = await confirmDialog({
            title: "이 행사를 삭제할까요?",
            description: `"${event.title_ko}" 행사와 연결된 자료가 모두 사라집니다. 행사 정보는 되돌릴 수 없습니다.`,
            confirmLabel: "행사 삭제",
            tone: "danger",
        });
        if (!ok) return;

        setBusy(true);
        try {
            const response = await fetch("/api/admin/events/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: event.id }),
            });
            if (handleUnauthorized(response)) return;
            if (!response.ok) {
                toast(`삭제하지 못했습니다: ${await response.text()}`, "error");
                return;
            }
            router.replace(`/admin-x7k3p9/resources/${slug}`);
        } catch (error) {
            toast(`삭제하지 못했습니다: ${errorMessage(error)}`, "error");
        } finally {
            setBusy(false);
        }
    }

    async function uploadAndAttach() {
        setErr(null);

        const role = roleToAdd.trim();
        const parsedSortOrder = Number(sortOrder);

        if (!role) {
            setErr("섹션을 선택하세요.");
            return;
        }

        const normalizedYoutubeUrl = isYoutubeMode
            ? canonicalYoutubeUrl(youtubeUrl)
            : null;

        if (isYoutubeMode && !normalizedYoutubeUrl) {
            setErr("올바른 유튜브 링크를 입력하세요.");
            return;
        }

        if (!isYoutubeMode && !file) {
            setErr("파일을 선택하세요.");
            return;
        }

        if (!resTitle.trim()) {
            setErr("자료 제목을 입력하세요.");
            return;
        }

        if (
            !Number.isInteger(parsedSortOrder) ||
            parsedSortOrder < 0
        ) {
            setErr("정렬 순서는 0 이상의 정수로 입력하세요.");
            return;
        }

        if (
            (isAwardDoc || isWinnerPhoto) &&
            !personKo.trim() &&
            !personEn.trim()
        ) {
            setErr(
                "수상 작품과 수상자 사진에는 수상자 이름을 국문 또는 영문 중 하나 이상 입력하세요."
            );
            return;
        }

        if (isAwardDoc && !award.trim()) {
            setErr("수상 작품에는 수상 등급을 입력하세요.");
            return;
        }

        setBusy(true);

        try {
            // 1. resources에 파일 또는 유튜브 링크 등록
            const formData = new FormData();
            formData.set("title", resTitle.trim());
            formData.set("note", note);
            formData.set("boardSlug", slug);
            formData.set("visibility", "public");

            if (isYoutubeMode && normalizedYoutubeUrl) {
                formData.set("source_path", normalizedYoutubeUrl);
            } else if (file) {
                formData.set("file", file);
            }

            const uploadResponse = await fetch("/api/admin/upload", {
                method: "POST",
                body: formData,
            });

            if (handleUnauthorized(uploadResponse)) return;

            if (!uploadResponse.ok) {
                setErr(await uploadResponse.text());
                return;
            }

            const uploadJson = await uploadResponse.json().catch(() => null);
            const resourceId = uploadJson?.resource?.id;

            if (!resourceId) {
                setErr(
                    "업로드 응답에서 resource.id를 찾지 못했습니다."
                );
                return;
            }

            /**
             * 2. event_assets에 행사 연결 정보 저장
             *
             * 중요:
             * - person_*는 공모전 수상/응모 자료에만 저장
             * - item_title_*와 award는 공모전 수상 작품에만 저장
             * - 다른 행사나 다른 role에는 명시적으로 null을 저장
             *
             * 따라서 화면에서 다른 role로 전환한 뒤 기존 입력값이 남아 있어도
             * 세미나·워크숍·포스터 등에 공모전 정보가 섞이지 않습니다.
             */
            const assetPayload = {
                event_id: event.id,
                role,
                resource_id: resourceId,
                person_ko: usesPersonMetadata
                    ? trimOrNull(personKo)
                    : null,
                person_en: usesPersonMetadata
                    ? trimOrNull(personEn)
                    : null,
                item_title_ko: isAwardDoc
                    ? trimOrNull(itemTitleKo)
                    : null,
                item_title_en: isAwardDoc
                    ? trimOrNull(itemTitleEn)
                    : null,
                award: isAwardDoc ? trimOrNull(award) : null,
                sort_order: parsedSortOrder,
            };

            const attachResponse = await fetch(
                "/api/admin/event-assets/add",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(assetPayload),
                }
            );

            if (handleUnauthorized(attachResponse)) return;

            if (!attachResponse.ok) {
                const attachError = await attachResponse.text();

                const cleanupResponse = await fetch(
                    "/api/admin/resources/delete",
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ resourceId }),
                    }
                );

                const cleanupMessage = cleanupResponse.ok
                    ? "방금 업로드된 미연결 자료는 정리했습니다."
                    : "방금 업로드된 자료 정리에 실패했습니다. 관리자 자료 목록을 확인해 주세요.";

                setErr(`${attachError}\n${cleanupMessage}`);
                return;
            }

            location.reload();
        } catch (error) {
            setErr(errorMessage(error));
        } finally {
            setBusy(false);
        }
    }


    return (
        <>
            {/* 행사 메타 수정 */}
            <div
                className={styles.card}
                style={{ marginBottom: 14 }}
            >
                <div style={{ fontWeight: 900, marginBottom: 10 }}>
                    행사 정보
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                    <label style={lbl}>
                        행사명(국문)
                        <input
                            value={titleKo}
                            onChange={(event) =>
                                setTitleKo(event.target.value)
                            }
                            style={inp}
                        />
                    </label>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 10,
                        }}
                    >
                        <label style={lbl}>
                            행사일
                            <input
                                type="date"
                                value={eventDate}
                                onChange={(event) =>
                                    setEventDate(event.target.value)
                                }
                                style={inp}
                            />
                        </label>

                        <label style={lbl}>
                            기간 종료
                            <input
                                type="date"
                                value={periodEnd}
                                onChange={(event) =>
                                    setPeriodEnd(event.target.value)
                                }
                                style={inp}
                            />
                        </label>
                    </div>

                    <button
                        onClick={saveEventMeta}
                        disabled={busy}
                        className={styles.searchBtn}
                        style={{ width: 140 }}
                    >
                        {busy ? "저장 중..." : "저장"}
                    </button>

                    {err ? (
                        <div
                            style={{
                                color: "crimson",
                                whiteSpace: "pre-wrap",
                            }}
                        >
                            {err}
                        </div>
                    ) : null}
                </div>
            </div>

            {/* 자료 추가 */}
            <div
                className={styles.card}
                style={{ marginBottom: 14 }}
            >
                <div style={{ fontWeight: 900, marginBottom: 10 }}>
                    자료 추가
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                    <label style={lbl}>
                        섹션
                        <select
                            value={roleToAdd}
                            onChange={(event) => {
                                const nextRole = event.target.value;
                                setRoleToAdd(nextRole);
                                setErr(null);
                                setFile(null);

                                const nextSupportsYoutube =
                                    isContest &&
                                    (nextRole === "award_doc" ||
                                        nextRole === "slide");

                                if (!nextSupportsYoutube) {
                                    setUploadMode("file");
                                    setYoutubeUrl("");
                                }
                            }}
                            style={inp}
                        >
                            <option value="">선택</option>

                            {selectableRoles.map((role) => (
                                <option key={role} value={role}>
                                    {roleLabel(role)}
                                </option>
                            ))}
                        </select>
                    </label>

                    {selectableRoles.length === 0 ? (
                        <div
                            style={{
                                color: "crimson",
                                fontSize: 13,
                            }}
                        >
                            이 행사 종류에 등록 가능한 섹션 설정이
                            없습니다.
                        </div>
                    ) : null}

                    <label style={lbl}>
                        자료 제목
                        <input
                            value={resTitle}
                            onChange={(event) =>
                                setResTitle(event.target.value)
                            }
                            placeholder="관리 화면과 자료 목록에 표시할 제목"
                            style={inp}
                        />
                    </label>

                    {/* 공모전 전용 메타데이터 */}
                    {usesPersonMetadata ? (
                        <div
                            style={{
                                display: "grid",
                                gap: 10,
                                padding: 12,
                                borderRadius: 10,
                                background: "#f7f8fa",
                            }}
                        >
                            <div style={{ fontWeight: 850 }}>
                                {isAwardDoc
                                    ? "수상 작품 정보"
                                    : isWinnerPhoto
                                      ? "수상자 사진 정보"
                                      : "응모작 정보"}
                            </div>

                            <label style={lbl}>
                                {isAwardDoc || isWinnerPhoto
                                    ? "수상자 이름(국문)"
                                    : "응모자 이름(국문)"}
                                <input
                                    value={personKo}
                                    onChange={(event) =>
                                        setPersonKo(event.target.value)
                                    }
                                    placeholder="예: 홍길동"
                                    style={inp}
                                />
                            </label>

                            <label style={lbl}>
                                {isAwardDoc || isWinnerPhoto
                                    ? "수상자 이름(영문)"
                                    : "응모자 이름(영문)"}
                                <input
                                    value={personEn}
                                    onChange={(event) =>
                                        setPersonEn(event.target.value)
                                    }
                                    placeholder="예: Hong Gil-dong"
                                    style={inp}
                                />
                            </label>

                            {isAwardDoc ? (
                                <>
                                    <label style={lbl}>
                                        수상 등급
                                        <input
                                            value={award}
                                            onChange={(event) =>
                                                setAward(
                                                    event.target.value
                                                )
                                            }
                                            list="award-options"
                                            placeholder="예: 대상, 금상, 은상"
                                            style={inp}
                                        />
                                        <datalist id="award-options">
                                            <option value="대상" />
                                            <option value="금상" />
                                            <option value="은상" />
                                            <option value="동상" />
                                            <option value="장려상" />
                                        </datalist>
                                    </label>

                                    <label style={lbl}>
                                        작품명(국문)
                                        <input
                                            value={itemTitleKo}
                                            onChange={(event) =>
                                                setItemTitleKo(
                                                    event.target.value
                                                )
                                            }
                                            placeholder="수상 작품명"
                                            style={inp}
                                        />
                                    </label>

                                    <label style={lbl}>
                                        작품명(영문)
                                        <input
                                            value={itemTitleEn}
                                            onChange={(event) =>
                                                setItemTitleEn(
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Award-winning work title"
                                            style={inp}
                                        />
                                    </label>
                                </>
                            ) : null}

                            {isAwardDoc || isWinnerPhoto ? (
                                <div
                                    style={{
                                        fontSize: 13,
                                        opacity: 0.72,
                                    }}
                                >
                                    수상 작품과 수상자 사진은 이름의
                                    국문·영문 입력값을 동일하게 맞춰야
                                    같은 수상자로 연결됩니다.
                                </div>
                            ) : (
                                <div
                                    style={{
                                        fontSize: 13,
                                        opacity: 0.72,
                                    }}
                                >
                                    응모자 이름은 선택 사항입니다. 입력하지
                                    않으면 자료 제목으로 표시됩니다.
                                </div>
                            )}
                        </div>
                    ) : null}

                    <label style={lbl}>
                        표시 순서
                        <input
                            type="number"
                            min={0}
                            step={1}
                            value={sortOrder}
                            onChange={(event) =>
                                setSortOrder(event.target.value)
                            }
                            style={inp}
                        />
                    </label>

                    <label style={lbl}>
                        세부 내용
                        <textarea
                            value={note}
                            onChange={(event) =>
                                setNote(event.target.value)
                            }
                            placeholder="(선택)"
                            style={{
                                ...inp,
                                minHeight: 70,
                            }}
                        />
                    </label>

                    {supportsYoutube ? (
                        <div
                            style={{
                                display: "grid",
                                gap: 8,
                                padding: 12,
                                borderRadius: 10,
                                border: "1px solid #e5e7eb",
                            }}
                        >
                            <div style={{ fontWeight: 800 }}>등록 방식</div>

                            <div style={{ display: "flex", gap: 18 }}>
                                <label
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 6,
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name="uploadMode"
                                        value="file"
                                        checked={uploadMode === "file"}
                                        onChange={() => {
                                            setUploadMode("file");
                                            setYoutubeUrl("");
                                            setErr(null);
                                        }}
                                    />
                                    파일 첨부
                                </label>

                                <label
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 6,
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name="uploadMode"
                                        value="youtube"
                                        checked={uploadMode === "youtube"}
                                        onChange={() => {
                                            setUploadMode("youtube");
                                            setFile(null);
                                            setErr(null);
                                        }}
                                    />
                                    유튜브 링크
                                </label>
                            </div>
                        </div>
                    ) : null}

                    {isYoutubeMode ? (
                        <label style={lbl}>
                            유튜브 링크
                            <input
                                type="url"
                                value={youtubeUrl}
                                onChange={(event) =>
                                    setYoutubeUrl(event.target.value)
                                }
                                placeholder="https://www.youtube.com/watch?v=..."
                                style={inp}
                            />
                            <span style={{ fontSize: 12, opacity: 0.7 }}>
                                일반 사용자 페이지에는 유튜브 영상 미리보기가
                                표시됩니다.
                            </span>
                        </label>
                    ) : (
                        <label style={lbl}>
                            파일
                            <input
                                key={`${roleToAdd}-${uploadMode}`}
                                type="file"
                                accept={fileAcceptForRole(roleToAdd, slug)}
                                onChange={(event) =>
                                    setFile(
                                        event.target.files?.[0] ?? null
                                    )
                                }
                            />
                            {slotFor(slug, roleToAdd) ? (
                                <span style={{ fontSize: 12, color: "#5f6b7c" }}>
                                    {slotFor(slug, roleToAdd)?.hint}
                                </span>
                            ) : null}
                        </label>
                    )}

                    <button
                        onClick={uploadAndAttach}
                        disabled={busy || selectableRoles.length === 0}
                        className={styles.searchBtn}
                        style={{ width: 180 }}
                    >
                        {busy
                            ? "등록 중..."
                            : isYoutubeMode
                              ? "+ 링크 등록 & 연결"
                              : "+ 업로드 & 연결"}
                    </button>
                </div>
            </div>

            {/* 등록된 섹션 */}
            {isSeminar ? (
                SEMINAR_SECTIONS.map((section) => {
                    const list = section.roles.flatMap(
                        (role) => grouped.get(role) ?? []
                    );

                    return (
                        <div
                            key={section.id}
                            className={styles.card}
                            style={{ marginBottom: 14 }}
                        >
                            <div
                                style={{
                                    fontWeight: 950,
                                    marginBottom: 10,
                                }}
                            >
                                {section.id === "poster"
                                    ? `${seminarKind} 포스터`
                                    : section.label}
                            </div>

                            {list.length === 0 ? (
                                <div
                                    style={{
                                        fontSize: 13,
                                        opacity: 0.7,
                                    }}
                                >
                                    등록된 자료가 없습니다.
                                </div>
                            ) : (
                                <div
                                    style={{
                                        display: "grid",
                                        gap: 8,
                                    }}
                                >
                                    {list.map((asset) => (
                                        <AssetRow
                                            key={asset.id}
                                            asset={asset}
                                            slug={slug}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })
            ) : (
                <>
                    {orderedRoles.map((role) => {
                        const list = grouped.get(role) ?? [];

                        return (
                            <div
                                key={role}
                                className={styles.card}
                                style={{ marginBottom: 14 }}
                            >
                                <div
                                    style={{
                                        fontWeight: 950,
                                        marginBottom: 10,
                                    }}
                                >
                                    {roleLabel(role)} ({role})
                                </div>

                                {list.length === 0 ? (
                                    <div
                                        style={{
                                            fontSize: 13,
                                            opacity: 0.7,
                                        }}
                                    >
                                        등록된 자료가 없습니다.
                                    </div>
                                ) : (
                                    <div
                                        style={{
                                            display: "grid",
                                            gap: 8,
                                        }}
                                    >
                                        {list.map((asset) => (
                                            <AssetRow
                                                key={asset.id}
                                                asset={asset}
                                                slug={slug}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </>
            )}

            <Card
                tone="danger"
                className="mt-10"
                title="행사 삭제"
                description="행사와 연결된 모든 자료가 공개 화면과 관리 목록에서 사라집니다."
                actions={
                    <Button variant="danger" onClick={deleteEvent} disabled={busy} icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}>
                        행사 삭제
                    </Button>
                }
            />
        </>
    );
}

const lbl: React.CSSProperties = {
    display: "grid",
    gap: 6,
    fontSize: 14,
};

const inp: React.CSSProperties = {
    border: "1px solid #ddd",
    borderRadius: 10,
    padding: 10,
    width: "100%",
};

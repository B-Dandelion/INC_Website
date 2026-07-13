"use client";

import { useMemo, useState } from "react";
import styles from "@/components/resources/SimpleListPage.module.css";

type Event = {
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

type Asset = {
    id: string;
    role: string;
    sort_order: number;
    award: string | null;
    person_ko: string | null;
    person_en: string | null;
    item_title_ko: string | null;
    item_title_en: string | null;
    resources: {
        id: number;
        title: string | null;
        mime: string | null;
        original_filename: string | null;
    } | null;
};

type RoleOption = {
    role: string;
    label: string;
};

/**
 * 행사 종류별로 실제 사용할 수 있는 event_assets.role만 정의합니다.
 *
 * - 공모전: 수상 작품, 수상자 사진, 응모작 사용
 * - 세미나: 시간표와 일반 자료 사용
 * - 워크숍/중간보고서: 일반 행사 자료만 사용
 *
 * DB 컬럼은 공통이지만, 관리자 UI와 저장 payload는 아래 설정에 따라
 * 행사 종류별로 필요한 값만 노출하고 저장합니다.
 */
const EVENT_ROLE_OPTIONS: Record<string, RoleOption[]> = {
    "essay-contest": [
        { role: "poster_ko", label: "포스터(국문)" },
        { role: "poster_en", label: "포스터(영문)" },
        { role: "award_doc", label: "수상 작품" },
        { role: "winner_photo", label: "수상자 사진" },
        { role: "photo", label: "행사 사진" },
        { role: "slide", label: "응모작" },
    ],
    "shortform-contest": [
        { role: "poster_ko", label: "포스터(국문)" },
        { role: "poster_en", label: "포스터(영문)" },
        { role: "award_doc", label: "수상 작품" },
        { role: "winner_photo", label: "수상자 사진" },
        { role: "photo", label: "행사 사진" },
        { role: "slide", label: "응모작" },
    ],
    seminar: [
        { role: "poster_ko", label: "포스터(국문)" },
        { role: "poster_en", label: "포스터(영문)" },
        { role: "timetable", label: "시간표" },
        { role: "photo", label: "사진" },
        { role: "slide", label: "자료" },
    ],
    workshop: [
        { role: "poster_ko", label: "포스터(국문)" },
        { role: "poster_en", label: "포스터(영문)" },
        { role: "photo", label: "사진" },
        { role: "slide", label: "자료" },
    ],
    "midterm-report": [
        { role: "poster_ko", label: "포스터(국문)" },
        { role: "poster_en", label: "포스터(영문)" },
        { role: "photo", label: "사진" },
        { role: "slide", label: "자료" },
    ],
};

const CONTEST_SLUGS = new Set(["essay-contest", "shortform-contest"]);

const SEMINAR_SECTIONS = [
    { id: "poster", label: "포스터", roles: ["poster_ko", "poster_en"] },
    { id: "timetable", label: "시간표", roles: ["timetable"] },
    { id: "photo", label: "사진", roles: ["photo"] },
    { id: "materials", label: "자료", roles: ["slide"] },
] as const;

const FALLBACK_ROLE_LABELS: Record<string, string> = {
    poster_ko: "포스터(국문)",
    poster_en: "포스터(영문)",
    timetable: "시간표",
    award_doc: "수상 작품",
    winner_photo: "수상자 사진",
    photo: "사진",
    slide: "자료",
};

function trimOrNull(value: string) {
    const trimmed = value.trim();
    return trimmed || null;
}

function errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}

export default function AdminEventDetailClient({
    slug,
    event,
    assets,
}: {
    slug: string;
    event: Event;
    assets: Asset[];
}) {
    const [busy, setBusy] = useState(false);

    // 행사 기본 정보
    const [titleKo, setTitleKo] = useState(event.title_ko ?? "");
    const [eventDate, setEventDate] = useState(event.event_date ?? "");
    const [periodEnd, setPeriodEnd] = useState(event.period_end ?? "");

    // 공통 업로드 정보
    const [roleToAdd, setRoleToAdd] = useState("");
    const [file, setFile] = useState<File | null>(null);
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

    function extOf(name?: string | null) {
        const value = (name ?? "").toLowerCase();
        const index = value.lastIndexOf(".");
        return index >= 0 ? value.slice(index + 1) : "";
    }

    function isImageLike(mime?: string | null, filename?: string | null) {
        if (typeof mime === "string" && mime.startsWith("image/")) return true;

        return ["png", "jpg", "jpeg", "webp", "gif"].includes(
            extOf(filename)
        );
    }

    function isVideoLike(mime?: string | null, filename?: string | null) {
        if (typeof mime === "string" && mime.startsWith("video/")) return true;

        return ["mp4", "mov", "webm", "mkv"].includes(extOf(filename));
    }

    function fileAcceptForRole(role: string) {
        if (
            ["poster_ko", "poster_en", "winner_photo", "photo"].includes(
                role
            )
        ) {
            return "image/*";
        }

        if (role === "slide" && slug === "shortform-contest") {
            return "video/*,.pdf";
        }

        return undefined;
    }

    const miniBtnStyle: React.CSSProperties = {
        fontSize: 13,
        height: 32,
        padding: "0 10px",
        borderRadius: 10,
    };

    async function saveEventMeta() {
        setErr(null);
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

    async function uploadAndAttach() {
        setErr(null);

        const role = roleToAdd.trim();
        const parsedSortOrder = Number(sortOrder);

        if (!role) {
            setErr("섹션을 선택하세요.");
            return;
        }

        if (!file) {
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
            // 1. resources에 실제 파일 업로드
            const formData = new FormData();
            formData.set("title", resTitle.trim());
            formData.set("note", note);
            formData.set("boardSlug", slug);
            formData.set("visibility", "public");
            formData.set("file", file);

            const uploadResponse = await fetch("/api/admin/upload", {
                method: "POST",
                body: formData,
            });

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

            if (!attachResponse.ok) {
                setErr(await attachResponse.text());
                return;
            }

            location.reload();
        } catch (error) {
            setErr(errorMessage(error));
        } finally {
            setBusy(false);
        }
    }

    function Thumb({
        rid,
        mime,
        filename,
    }: {
        rid: number;
        mime: string | null;
        filename: string | null;
    }) {
        const thumb = `/api/resources/go?id=${rid}&thumb=1`;

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

    function AssetRow({ asset }: { asset: Asset }) {
        async function replaceResource(resourceId: number) {
            const input = document.createElement("input");
            input.type = "file";

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

                if (!response.ok) {
                    alert(await response.text());
                    return;
                }

                location.reload();
            };

            input.click();
        }

        async function deleteResource(resourceId: number) {
            const confirmed = confirm(
                "리소스를 삭제(soft delete)할까요? 행사에서만 제거가 아니라 파일 자체가 숨김 처리됩니다."
            );

            if (!confirmed) return;

            const response = await fetch(
                "/api/admin/resources/delete",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ resourceId }),
                }
            );

            if (!response.ok) {
                alert(await response.text());
                return;
            }

            location.reload();
        }

        const rid = asset.resources?.id ?? null;
        const mime = asset.resources?.mime ?? null;
        const filename = asset.resources?.original_filename ?? null;
        const title =
            asset.resources?.title ??
            asset.resources?.original_filename ??
            `resource ${rid ?? "-"}`;
        const itemTitle =
            asset.item_title_ko ?? asset.item_title_en ?? null;
        const person =
            asset.person_ko ?? asset.person_en ?? null;
        const href = rid ? `/api/resources/go?id=${rid}` : "#";

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
                    {rid ? (
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
                                열기
                            </a>

                            <button
                                type="button"
                                onClick={() => replaceResource(rid)}
                                className={styles.pagerBtn}
                                style={miniBtnStyle}
                            >
                                교체
                            </button>

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

                    <button
                        type="button"
                        onClick={async () => {
                            const confirmed = confirm(
                                "행사를 삭제할까요? 연결된 자료도 전부 삭제(soft delete)됩니다."
                            );

                            if (!confirmed) return;

                            const response = await fetch(
                                "/api/admin/events/delete",
                                {
                                    method: "POST",
                                    headers: {
                                        "Content-Type":
                                            "application/json",
                                    },
                                    body: JSON.stringify({
                                        id: event.id,
                                    }),
                                }
                            );

                            if (!response.ok) {
                                alert(await response.text());
                                return;
                            }

                            location.href = `/admin-x7k3p9/resources/${slug}`;
                        }}
                        className={styles.pagerBtn}
                        style={{
                            ...miniBtnStyle,
                            borderColor: "#ffb3b3",
                        }}
                    >
                        행사 삭제
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
                                setRoleToAdd(event.target.value);
                                setErr(null);
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

                    <label style={lbl}>
                        파일
                        <input
                            type="file"
                            accept={fileAcceptForRole(roleToAdd)}
                            onChange={(event) =>
                                setFile(
                                    event.target.files?.[0] ?? null
                                )
                            }
                        />
                    </label>

                    <button
                        onClick={uploadAndAttach}
                        disabled={busy || selectableRoles.length === 0}
                        className={styles.searchBtn}
                        style={{ width: 180 }}
                    >
                        {busy
                            ? "업로드 중..."
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
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </>
            )}
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

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
    id: string; // event_assets.id
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

    // meta form
    const [titleKo, setTitleKo] = useState(event.title_ko ?? "");
    const [eventDate, setEventDate] = useState(event.event_date ?? "");
    const [periodEnd, setPeriodEnd] = useState(event.period_end ?? "");

    // upload
    const [roleToAdd, setRoleToAdd] = useState<string>("");
    const [file, setFile] = useState<File | null>(null);
    const [resTitle, setResTitle] = useState<string>(""); // resources.title
    const [note, setNote] = useState<string>(""); // resources.note
    const [err, setErr] = useState<string | null>(null);

    const SEMINAR_SECTIONS = [
        { id: "poster", label: "포스터", roles: ["poster_ko", "poster_en"] },
        { id: "timetable", label: "시간표", roles: ["timetable"] },
        { id: "photo", label: "사진", roles: ["photo"] },
        { id: "materials", label: "자료", roles: ["slide"] },
    ] as const;

    const SEMINAR_ROLE_OPTIONS = Array.from(new Set(SEMINAR_SECTIONS.flatMap((s) => s.roles)));

    const ROLE_LABEL: Record<string, string> = {
        poster_ko: "포스터(국문)",
        poster_en: "포스터(영문)",
        timetable: "시간표",
        photo: "사진",
        slide: "자료",
    };
    function roleLabel(role: string) {
        return ROLE_LABEL[role] ?? role;
    }

    const isSeminar = slug === "seminar";
    const seminarKind = event.subtype === "international" ? "국제" : "국내";

    const roles = useMemo(() => {
        const s = new Set<string>();
        for (const a of assets) s.add(a.role);
        return Array.from(s).sort((a, b) => a.localeCompare(b));
    }, [assets]);

    const grouped = useMemo(() => {
        const m = new Map<string, Asset[]>();
        for (const a of assets) {
            const key = a.role || "unknown";
            if (!m.has(key)) m.set(key, []);
            m.get(key)!.push(a);
        }
        for (const [, arr] of m) arr.sort((x, y) => (x.sort_order ?? 0) - (y.sort_order ?? 0));
        return m;
    }, [assets]);

    function extOf(name?: string | null) {
        const s = (name ?? "").toLowerCase();
        const i = s.lastIndexOf(".");
        return i >= 0 ? s.slice(i + 1) : "";
    }

    function isImageLike(mime?: string | null, filename?: string | null) {
        if (typeof mime === "string" && mime.startsWith("image/")) return true;
        const ext = extOf(filename);
        return ["png", "jpg", "jpeg", "webp", "gif"].includes(ext);
    }

    function isVideoLike(mime?: string | null, filename?: string | null) {
        if (typeof mime === "string" && mime.startsWith("video/")) return true;
        const ext = extOf(filename);
        return ["mp4", "mov", "webm", "mkv"].includes(ext);
    }

    const miniBtnStyle: React.CSSProperties = {
        fontSize: 13,
        height: 32,
        padding: "0 10px",
        borderRadius: 10,
    };

    const DEFAULT_SECTION_ORDER: Record<string, string[]> = {
        "essay-contest": ["poster_ko", "poster_en", "winners", "winner_photo", "award_doc", "photo", "slide"],
        "shortform-contest": ["poster_ko", "poster_en", "photo", "slide"],
        "workshop": ["poster_ko", "poster_en", "photo", "slide"],
        "midterm-report": ["poster_ko", "poster_en", "photo", "slide"],
    };

    const orderForSlug = DEFAULT_SECTION_ORDER[slug] ?? [];

    const orderedRoles = [
        ...orderForSlug.filter((r) => grouped.has(r)),
        ...Array.from(grouped.keys()).filter((r) => !orderForSlug.includes(r)).sort((a, b) => a.localeCompare(b)),
    ];

    async function saveEventMeta() {
        setErr(null);
        setBusy(true);
        try {
            const patch: any = {
                title_ko: titleKo.trim(),
                event_date: eventDate || null,
                period_end: periodEnd || null,
            };

            const res = await fetch("/api/admin/events/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: event.id, patch }),
            });

            if (!res.ok) {
                setErr(await res.text());
                return;
            }
            location.reload();
        } finally {
            setBusy(false);
        }
    }

    async function unlinkAsset(assetId: string) {
        if (!confirm("행사에서만 제거할까요? (삭제하지 않은 파일은 유지됩니다)")) return;
        setBusy(true);
        try {
            const res = await fetch("/api/admin/event-assets/remove", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: assetId }),
            });
            if (!res.ok) {
                alert(await res.text());
                return;
            }
            location.reload();
        } finally {
            setBusy(false);
        }
    }

    async function uploadAndAttach() {
        setErr(null);

        const role = roleToAdd.trim();
        if (!role) return setErr("섹션(role)을 선택하세요.");
        if (!file) return setErr("파일을 선택하세요.");
        if (!resTitle.trim()) return setErr("자료 제목(title)을 입력하세요.");

        setBusy(true);
        try {
            // 1) resources upload
            const fd = new FormData();
            fd.set("title", resTitle.trim());
            fd.set("note", note);
            fd.set("boardSlug", slug);
            fd.set("visibility", "public");
            fd.set("file", file);

            const up = await fetch("/api/admin/upload", { method: "POST", body: fd });
            if (!up.ok) {
                setErr(await up.text());
                return;
            }
            const upJson = await up.json().catch(() => null);
            const resourceId = upJson?.resource?.id;
            if (!resourceId) {
                setErr("업로드 응답에서 resource.id를 찾지 못했습니다.");
                return;
            }

            // 2) event_assets add
            const add = await fetch("/api/admin/event-assets/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    event_id: event.id,
                    role,
                    resource_id: resourceId,
                    sort_order: 0,
                }),
            });

            if (!add.ok) {
                setErr(await add.text());
                return;
            }

            location.reload();
        } finally {
            setBusy(false);
        }
    }

    function Thumb({ rid, mime, filename }: { rid: number; mime: string | null; filename: string | null }) {
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

    function AssetRow({ a }: { a: Asset }) {
        async function replaceResource(resourceId: number) {
            const input = document.createElement("input");
            input.type = "file";
            input.onchange = async () => {
                const f = input.files?.[0];
                if (!f) return;

                const fd = new FormData();
                fd.set("resourceId", String(resourceId));
                fd.set("file", f);

                const res = await fetch("/api/admin/resources/replace", { method: "POST", body: fd });
                if (!res.ok) {
                    alert(await res.text());
                    return;
                }
                location.reload();
            };
            input.click();
        }

        async function deleteResource(resourceId: number) {
            if (!confirm("리소스를 삭제(soft delete)할까요? 행사에서만 제거가 아니라 파일 자체가 숨김 처리됩니다.")) return;
            const res = await fetch("/api/admin/resources/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ resourceId }),
            });
            if (!res.ok) {
                alert(await res.text());
                return;
            }
            location.reload();
        }
        const rid = a.resources?.id ?? null;
        const mime = a.resources?.mime ?? null;
        const filename = a.resources?.original_filename ?? null;
        const title = a.resources?.title ?? a.resources?.original_filename ?? `resource ${rid ?? "-"}`;
        const href = rid ? `/api/resources/go?id=${rid}` : "#";

        return (
            <div
                key={a.id}
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
                <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                    {rid ? <Thumb rid={rid} mime={mime} filename={filename} /> : null}

                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 900 }}>{title}</div>
                        <div style={{ fontSize: 12, opacity: 0.7 }}>
                            {a.person_en || a.person_ko ? `인물: ${a.person_en ?? a.person_ko}` : ""}
                            {a.award ? ` · 수상: ${a.award}` : ""}
                        </div>
                    </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
                                style={{ ...miniBtnStyle, borderColor: "#ffb3b3" }}
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
            <div className={styles.card} style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 900, marginBottom: 10 }}>행사 정보</div>

                <div style={{ display: "grid", gap: 10 }}>
                    <label style={lbl}>
                        행사명(국문)
                        <input value={titleKo} onChange={(e) => setTitleKo(e.target.value)} style={inp} />
                    </label>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <label style={lbl}>
                            행사일
                            <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} style={inp} />
                        </label>
                        <label style={lbl}>
                            기간 종료
                            <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} style={inp} />
                        </label>
                    </div>

                    <button onClick={saveEventMeta} disabled={busy} className={styles.searchBtn} style={{ width: 140 }}>
                        {busy ? "저장 중..." : "저장"}
                    </button>

                    <button
                        type="button"
                        onClick={async () => {
                            if (!confirm("행사를 삭제할까요? 연결된 자료도 전부 삭제(soft delete)됩니다.")) return;
                            const res = await fetch("/api/admin/events/delete", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ id: event.id }),
                            });
                            if (!res.ok) {
                                alert(await res.text());
                                return;
                            }
                            location.href = `/admin-x7k3p9/resources/${slug}`;
                        }}
                        className={styles.pagerBtn}
                        style={{ ...miniBtnStyle, borderColor: "#ffb3b3" }}
                    >
                        행사 삭제
                    </button>

                    {err ? <div style={{ color: "crimson", whiteSpace: "pre-wrap" }}>{err}</div> : null}
                </div>
            </div>

            {/* 자료 추가 */}
            <div className={styles.card} style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 900, marginBottom: 10 }}>자료 추가</div>

                <div style={{ display: "grid", gap: 10 }}>
                    <label style={lbl}>
                        섹션
                        <select value={roleToAdd} onChange={(e) => setRoleToAdd(e.target.value)} style={inp}>
                            <option value="">선택</option>
                            {(isSeminar ? SEMINAR_ROLE_OPTIONS : roles).map((r) => (
                                <option key={r} value={r}>
                                    {roleLabel(r)}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label style={lbl}>
                        자료 제목
                        <input value={resTitle} onChange={(e) => setResTitle(e.target.value)} style={inp} />
                    </label>

                    <label style={lbl}>
                        세부 내용
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="(선택)"
                            style={{ ...inp, minHeight: 70 }}
                        />
                    </label>

                    <label style={lbl}>
                        파일
                        <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                    </label>

                    <button onClick={uploadAndAttach} disabled={busy} className={styles.searchBtn} style={{ width: 180 }}>
                        {busy ? "업로드 중..." : "+ 업로드 & 연결"}
                    </button>
                </div>
            </div>

            {/* 섹션 */}
            {isSeminar ? (
                SEMINAR_SECTIONS.map((sec) => {
                    const list = sec.roles.flatMap((r) => grouped.get(r) ?? []);

                    return (
                        <div key={sec.id} className={styles.card} style={{ marginBottom: 14 }}>
                            <div style={{ fontWeight: 950, marginBottom: 10 }}>
                                {sec.id === "poster" ? `${seminarKind} 포스터` : sec.label}
                            </div>

                            {list.length === 0 ? (
                                <div style={{ fontSize: 13, opacity: 0.7 }}>등록된 자료가 없습니다.</div>
                            ) : (
                                <div style={{ display: "grid", gap: 8 }}>
                                    {list.map((a) => (
                                        <AssetRow key={a.id} a={a} />
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
                            <div key={role} className={styles.card} style={{ marginBottom: 14 }}>
                                <div style={{ fontWeight: 950, marginBottom: 10 }}>{roleLabel(role)} ({role})</div>

                                {list.length === 0 ? (
                                    <div style={{ fontSize: 13, opacity: 0.7 }}>등록된 자료가 없습니다.</div>
                                ) : (
                                    <div style={{ display: "grid", gap: 8 }}>
                                        {list.map((a) => (
                                            <AssetRow key={a.id} a={a} />
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

const lbl: React.CSSProperties = { display: "grid", gap: 6, fontSize: 14 };
const inp: React.CSSProperties = { border: "1px solid #ddd", borderRadius: 10, padding: 10, width: "100%" };
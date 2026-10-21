// Role and section definitions for the admin event detail screen.

export type RoleOption = {
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
export const EVENT_ROLE_OPTIONS: Record<string, RoleOption[]> = {
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
        { role: "timetable", label: "시간표" },
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

export const CONTEST_SLUGS = new Set(["essay-contest", "shortform-contest"]);

export const SEMINAR_SECTIONS = [
    { id: "poster", label: "포스터", roles: ["poster_ko", "poster_en"] },
    { id: "timetable", label: "시간표", roles: ["timetable"] },
    { id: "photo", label: "사진", roles: ["photo"] },
    { id: "materials", label: "자료", roles: ["slide"] },
] as const;

export const FALLBACK_ROLE_LABELS: Record<string, string> = {
    poster_ko: "포스터(국문)",
    poster_en: "포스터(영문)",
    timetable: "시간표",
    award_doc: "수상 작품",
    winner_photo: "수상자 사진",
    photo: "사진",
    slide: "자료",
};

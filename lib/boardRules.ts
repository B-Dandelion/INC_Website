// lib/boardRules.ts
// One place that says, for every resource board, what can be uploaded where.
// The admin sidebar, list, uploader and event screens all read from here, so a
// rule changes in one spot. Client-safe: no server-only imports.

export type EventCategory = "seminar" | "workshop" | "essay_contest" | "shortform_contest" | "project_report";

export type AssetSlot = {
  role: string;
  label: string;
  // Value for <input accept>; undefined means any supported file.
  accept?: string;
  // Short sentence shown next to the upload control.
  hint: string;
  // Only one file makes sense here (a poster, a timetable).
  single?: boolean;
  // Contest entries carry a person and a work title.
  contestMeta?: boolean;
};

export type Subtype = { value: string; label: string };

type BoardBase = { slug: string; label: string };

export type ListBoard = BoardBase & {
  type: "list";
  dateField: "published_at" | "posted_at";
  dateRequired: boolean;
  dateLabel: string;
  // Issue boards (ATM, Heartbeat) show "No. 339" from the title.
  issueNumbers: boolean;
  uploadHint: string;
};

export type EventBoard = BoardBase & {
  type: "event";
  category: EventCategory;
  subtypes?: Subtype[];
  defaultSubtype?: string;
  slots: AssetSlot[];
};

export type BoardRule = ListBoard | EventBoard;

const POSTER: AssetSlot[] = [
  { role: "poster_ko", label: "포스터(국문)", accept: "image/*,.pdf,application/pdf", hint: "이미지 또는 PDF 1개", single: true },
  { role: "poster_en", label: "포스터(영문)", accept: "image/*,.pdf,application/pdf", hint: "이미지 또는 PDF 1개", single: true },
];
const TIMETABLE: AssetSlot = { role: "timetable", label: "시간표", hint: "이미지 또는 문서 1개", single: true };
const PHOTO: AssetSlot = { role: "photo", label: "사진", accept: "image/*", hint: "이미지 여러 장" };
const MATERIALS: AssetSlot = { role: "slide", label: "자료", hint: "발표 자료·문서 여러 개, YouTube 링크 가능" };

const contestSlots = (entryAccept: string | undefined, entryHint: string): AssetSlot[] => [
  ...POSTER,
  { role: "award_doc", label: "수상 작품", hint: "수상작 파일, 수상자·작품명 함께 입력", contestMeta: true },
  { role: "winner_photo", label: "수상자 사진", accept: "image/*", hint: "이미지, 수상자 이름 함께 입력", contestMeta: true },
  { role: "photo", label: "행사 사진", accept: "image/*", hint: "이미지 여러 장" },
  { role: "slide", label: "응모작", accept: entryAccept, hint: entryHint, contestMeta: true },
];

export const BOARD_RULES: BoardRule[] = [
  { slug: "atm", label: "ATM", type: "list", dateField: "published_at", dateRequired: true, dateLabel: "발간일", issueNumbers: true, uploadHint: "발간일이 꼭 필요합니다. 파일 이름의 날짜(예: 2026_AUG_25)를 자동으로 읽습니다." },
  { slug: "heartbeat-of-atoms", label: "Heartbeat of Atoms", type: "list", dateField: "published_at", dateRequired: true, dateLabel: "발간일", issueNumbers: true, uploadHint: "발간일이 꼭 필요합니다. 파일 이름의 날짜를 자동으로 읽습니다." },
  { slug: "lecture", label: "강연자료", type: "list", dateField: "posted_at", dateRequired: false, dateLabel: "게시일", issueNumbers: false, uploadHint: "강연 자료 파일을 올립니다. 날짜를 비우면 오늘로 게시됩니다." },
  { slug: "contribution", label: "기고문", type: "list", dateField: "posted_at", dateRequired: false, dateLabel: "게시일", issueNumbers: false, uploadHint: "기고문 파일을 올립니다. 날짜를 비우면 오늘로 게시됩니다." },
  {
    slug: "seminar", label: "세미나", type: "event", category: "seminar",
    subtypes: [{ value: "international", label: "국제" }, { value: "domestic", label: "국내" }],
    defaultSubtype: "international",
    slots: [...POSTER, TIMETABLE, PHOTO, MATERIALS],
  },
  { slug: "expert-opinion-report", label: "전문가 의견 보고서", type: "list", dateField: "posted_at", dateRequired: false, dateLabel: "게시일", issueNumbers: false, uploadHint: "보고서 파일을 올립니다. 날짜를 비우면 오늘로 게시됩니다." },
  { slug: "essay-contest", label: "에세이 경진대회", type: "event", category: "essay_contest", slots: contestSlots(undefined, "응모작 문서, 응모자·작품명 함께 입력") },
  { slug: "shortform-contest", label: "숏폼영상 공모전", type: "event", category: "shortform_contest", slots: contestSlots("video/*,.pdf,application/pdf", "영상 또는 PDF, YouTube 링크 가능") },
  {
    slug: "midterm-report", label: "과제 보고회", type: "event", category: "project_report",
    subtypes: [{ value: "midterm", label: "중간" }, { value: "final", label: "최종" }],
    defaultSubtype: "midterm",
    slots: [...POSTER, PHOTO, MATERIALS],
  },
  { slug: "misc-reports", label: "기타 보고서", type: "list", dateField: "posted_at", dateRequired: false, dateLabel: "게시일", issueNumbers: false, uploadHint: "보고서 파일을 올립니다. 날짜를 비우면 오늘로 게시됩니다." },
  { slug: "workshop", label: "워크샵", type: "event", category: "workshop", slots: [...POSTER, TIMETABLE, PHOTO, MATERIALS] },
];

export function boardRule(slug: string): BoardRule | undefined {
  return BOARD_RULES.find((rule) => rule.slug === slug);
}

export function eventBoardRule(slug: string): EventBoard | undefined {
  const rule = boardRule(slug);
  return rule?.type === "event" ? rule : undefined;
}

export function listBoardRule(slug: string): ListBoard | undefined {
  const rule = boardRule(slug);
  return rule?.type === "list" ? rule : undefined;
}

export function slotFor(slug: string, role: string): AssetSlot | undefined {
  return eventBoardRule(slug)?.slots.find((slot) => slot.role === role);
}

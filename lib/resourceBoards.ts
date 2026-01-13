// lib/resourceBoards.ts
export const RESOURCE_BOARDS = [
  { slug: "atm", label: "ATM" },
  { slug: "heartbeat-of-atoms", label: "Heartbeat of Atoms" },

  { slug: "lecture", label: "강연자료" },
  { slug: "contribution", label: "기고문" },
  { slug: "seminar", label: "세미나" },

  { slug: "expert-opinion-report", label: "전문가의견보고서" },
  { slug: "shortform-contest", label: "숏폼영상공모전" },
  { slug: "essay-contest", label: "에세이 경진대회" },
  { slug: "midterm-report", label: "과제중간보고회" },
  { slug: "misc-reports", label: "기타 보고서" }, // 각종 보고서 -> 기타 보고서
  { slug: "workshop", label: "워크샵" },
] as const;

export type ResourceBoardSlug = (typeof RESOURCE_BOARDS)[number]["slug"];
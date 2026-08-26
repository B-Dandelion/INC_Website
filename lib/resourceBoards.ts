export const RESOURCE_BOARDS = [
  { slug: "atm", label: "ATM", labelEn: "ATM" },
  { slug: "heartbeat-of-atoms", label: "Heartbeat of Atoms", labelEn: "Heartbeat of Atoms" },
  { slug: "lecture", label: "강연자료", labelEn: "Lecture Materials" },
  { slug: "contribution", label: "기고문", labelEn: "Contributions" },
  { slug: "seminar", label: "세미나", labelEn: "Seminars" },
  { slug: "expert-opinion-report", label: "전문가의견보고서", labelEn: "Expert Opinion Reports" },
  { slug: "shortform-contest", label: "숏폼영상공모전", labelEn: "Short-form Video Contest" },
  { slug: "essay-contest", label: "에세이 경진대회", labelEn: "Essay Contest" },
  { slug: "midterm-report", label: "과제중간보고회", labelEn: "Project Progress Reports" },
  { slug: "misc-reports", label: "기타 보고서", labelEn: "Other Reports" },
  { slug: "workshop", label: "워크샵", labelEn: "Workshops" },
] as const;

export type ResourceBoardSlug = (typeof RESOURCE_BOARDS)[number]["slug"];
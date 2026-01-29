// lib/resourceCategories.ts
export type ResourceCategoryLink = { label: string; href: string; }; 
export const resourceCategories = [
  { label: "ATM", href: "/resources/atm" },
  { label: "Heartbeat of Atoms", href: "/resources/heartbeat-of-atoms" },
  { label: "강연자료", href: "/resources/lecture" },
  { label: "세미나", href: "/resources/seminar" },
  { label: "워크샵", href: "/resources/workshop" },
  { label: "과제중간보고회", href: "/resources/midterm-report" },
  { label: "기고문", href: "/resources/contribution" },
  { label: "전문가의견보고서", href: "/resources/expert-opinion-report" },
  { label: "기타 보고서", href: "/resources/misc-reports" },
  { label: "숏폼영상공모전", href: "/resources/shortform-contest" },
  { label: "에세이 경진대회", href: "/resources/essay-contest" },
];

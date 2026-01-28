// lib/resourceCategories.ts
export type ResourceCategoryLink = { label: string; href: string; }; 
export const resourceCategories: ResourceCategoryLink[] = 
[ { label: "ATM", href: "/resources/atm" },
  { label: "Heartbeat of Atoms", href: "/resources/heartbeat-of-atoms" },
  { label: "강연자료", href: "/resources/lectures" },
  { label: "세미나", href: "/resources/seminar" },
  { label: "워크샵", href: "/resources/workshop" }, 
  { label: "과제중간보고회", href: "/resources/progress-reports" },
  { label: "기고문", href: "/resources/contributions" }, 
  { label: "전문가의견보고서", href: "/resources/expert-reports" }, 
  { label: "기타 보고서", href: "/resources/other-reports" }, 
  { label: "숏폼영상공모전", href: "/resources/shortform-contest" }, 
  { label: "에세이 경진대회", href: "/resources/essay-contest" }, 
];

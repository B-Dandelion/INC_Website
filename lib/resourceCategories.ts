export type ResourceCategoryLink = {
  label: string;
  labelEn: string;
  href: string;
};

export const resourceCategories: ResourceCategoryLink[] = [
  { label: "ATM", labelEn: "ATM", href: "/resources/atm" },
  { label: "Heartbeat of Atoms", labelEn: "Heartbeat of Atoms", href: "/resources/heartbeat-of-atoms" },
  { label: "강연자료", labelEn: "Lecture Materials", href: "/resources/lecture" },
  { label: "세미나", labelEn: "Seminars", href: "/resources/seminar" },
  { label: "워크샵", labelEn: "Workshops", href: "/resources/workshop" },
  { label: "과제중간보고회", labelEn: "Project Progress Reports", href: "/resources/midterm-report" },
  { label: "기고문", labelEn: "Contributions", href: "/resources/contribution" },
  { label: "전문가의견보고서", labelEn: "Expert Opinion Reports", href: "/resources/expert-opinion-report" },
  { label: "기타 보고서", labelEn: "Other Reports", href: "/resources/misc-reports" },
  { label: "숏폼영상공모전", labelEn: "Short-form Video Contest", href: "/resources/shortform-contest" },
  { label: "에세이 경진대회", labelEn: "Essay Contest", href: "/resources/essay-contest" },
];
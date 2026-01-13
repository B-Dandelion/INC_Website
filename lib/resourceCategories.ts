// lib/resourceCategories.ts
export const RESOURCE_CATEGORIES = [
  "ATM",
  "Heartbeat of Atoms",
  "강연자료",
  "기고문",
  "세미나",
  "전문가의견보고서",
  "숏폼영상공모전",
  "에세이 경진대회",
  "과제중간보고회",
  "기타 보고서",
  "워크샵",
] as const;

export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];

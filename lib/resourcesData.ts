// lib/resourcesData.ts
export type ResourceKind = "pdf" | "image" | "post" | "slide" | "doc" | "zip" | "link";

export type ResourceItem = {
  id: string;
  title: string;
  kind: ResourceKind;
  href: string;      // 구글드라이브/노션/파일서버 링크 등
  date?: string;     // "2026-01-08" 같은 형태 추천
  note?: string;
};

export const resourcesData = {
  publications: {
    atm: [
      {
        id: "atm-001",
        title: "ATM Vol.1 (PDF)",
        kind: "pdf",
        href: "#",
        date: "2026-01-08",
        note: "발간물 PDF 업로드 예정",
      },
    ] satisfies ResourceItem[],
    heartbeat: [
      {
        id: "hb-001",
        title: "Heartbeat of Atoms No.1 (PDF)",
        kind: "pdf",
        href: "#",
        note: "발간물 PDF 업로드 예정",
      },
    ] satisfies ResourceItem[],
  },

  awards: {
    essayKr: [
      {
        id: "award-kr-001",
        title: "에세이 행사 소개 포스트 (국문) - 수상작 1",
        kind: "post",
        href: "#",
        note: "작품별 파일 + 사진 세트로 정리",
      },
    ] satisfies ResourceItem[],
    essayEn: [
      {
        id: "award-en-001",
        title: "Essay Event Intro Post (EN) - Winner 1",
        kind: "post",
        href: "#",
      },
    ] satisfies ResourceItem[],
    photos: [
      {
        id: "award-photo-001",
        title: "행사 사진 모음 (ZIP)",
        kind: "zip",
        href: "#",
      },
    ] satisfies ResourceItem[],
  },

  shortform: [
    {
      id: "sf-001",
      title: "숏폼 에세이 - 작품 1",
      kind: "post",
      href: "#",
      note: "수상작별 파일 구조 동일",
    },
  ] satisfies ResourceItem[],

  reports: [
    {
      id: "rep-001",
      title: "외부 보고서 2025-12 (PDF)",
      kind: "pdf",
      href: "#",
    },
  ] satisfies ResourceItem[],

  meetings: {
    intro: [
      { id: "mt-intro-001", title: "달개비 회의 - 행사 소개문", kind: "doc", href: "#" },
    ] satisfies ResourceItem[],
    slides: [
      { id: "mt-slide-001", title: "달개비 회의 - 발표 자료", kind: "slide", href: "#" },
    ] satisfies ResourceItem[],
    photos: [
      { id: "mt-photo-001", title: "달개비 회의 - 사진", kind: "image", href: "#" },
    ] satisfies ResourceItem[],
  },

  events: [
    {
      id: "ev-001",
      title: "기타 행사 1 - 자료 묶음",
      kind: "link",
      href: "#",
    },
  ] satisfies ResourceItem[],
};
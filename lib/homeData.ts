export type LatestItem = {
  title: string;
  date: string; // YYYY-MM-DD
  href: string;
};

export type LinkCard = {
  title: string;
  description: string;
  href: string;
};

export const quickLinks: LinkCard[] = [
  { title: "INC 소개", description: "기관 개요 및 비전", href: "/about" },
  { title: "연구진", description: "연구진 및 연구 분야", href: "/people" },
  { title: "국제교류", description: "국제 협력 및 교류 활동", href: "/global" },
  { title: "자료실", description: "보고서·발간물·자료", href: "/resources" },
  { title: "공지사항", description: "최신 공지 및 안내", href: "/news" },
  { title: "문의", description: "연락처 및 문의", href: "/contact" },
];

export const latestNotices: LatestItem[] = [
  { title: "홈페이지 개편 안내", date: "2026-01-05", href: "/news/notice-1" },
  { title: "국제협력 세미나 참가 신청", date: "2026-01-02", href: "/news/notice-2" },
  { title: "연구자료 이용 가이드", date: "2025-12-20", href: "/news/notice-3" },
];

export const latestResources: LatestItem[] = [
  { title: "2025 연간 보고서 (요약)", date: "2026-01-04", href: "/resources/report-2025" },
  { title: "정책 브리프: 국제 협력 동향", date: "2025-12-28", href: "/resources/brief-1" },
  { title: "발간물: INC Newsletter Vol.1", date: "2025-12-10", href: "/resources/newsletter-1" },
];

export const latestEvent: LatestItem | null = {
  title: "INC Open Forum (온라인) - 사전등록",
  date: "2026-01-15",
  href: "/events/open-forum-2026",
};

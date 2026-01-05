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
export type HighlightItem = {
  title: string;
  summary: string;
  tags: string[];
  href: string;
};

export type PartnerItem = {
  name: string;
  href: string;
  logoSrc?: string; // /public 아래 경로 사용: 예) "/partners/kaeri.png"
};

export const highlights: HighlightItem[] = [
  {
    title: "국제 공동연구 프로그램",
    summary: "핵연료주기, 안전규제, 비확산 등 핵심 분야에서 공동연구를 추진합니다.",
    tags: ["공동연구", "안전", "비확산"],
    href: "/research/program-1",
  },
  {
    title: "정책 브리프 및 동향 분석",
    summary: "국내외 원자력 정책·규제 동향을 정리하고, 의사결정에 필요한 정보를 제공합니다.",
    tags: ["정책", "동향", "브리프"],
    href: "/research/briefs",
  },
  {
    title: "전문가 네트워크 및 포럼",
    summary: "연구자·기관·산업 파트너를 연결하는 네트워크를 운영합니다.",
    tags: ["네트워크", "포럼", "협력"],
    href: "/research/forum",
  },
];

export const partners: PartnerItem[] = [
  { name: "KAERI", href: "https://www.kaeri.re.kr" },
  { name: "IAEA", href: "https://www.iaea.org" },
  { name: "OECD/NEA", href: "https://www.oecd-nea.org" },
  { name: "Partner A", href: "#" },
  { name: "Partner B", href: "#" },
  { name: "Partner C", href: "#" },
];

export type ContactInfo = {
  orgName: string;
  address: string;
  phone: string;
  email: string;
  webmasterEmail: string;
};

export type PolicyLink = {
  label: string;
  href: string;
};

export const contactInfo: ContactInfo = {
  orgName: "INC",
  address: "서울특별시 (주소 확정 필요)",
  phone: "02-0000-0000",
  email: "contact@example.org",
  webmasterEmail: "webmaster@example.org",
};

export const policyLinks: PolicyLink[] = [
  { label: "개인정보처리방침", href: "/policy/privacy" },
  { label: "저작권정책", href: "/policy/copyright" },
  { label: "이메일무단수집거부", href: "/policy/email" },
  { label: "오시는 길", href: "/contact" },
];

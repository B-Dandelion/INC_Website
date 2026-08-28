import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "공지사항",
  description: "INC의 최신 공지사항과 주요 안내를 확인할 수 있습니다.",
  openGraph: {
    title: "공지사항 | INC",
    description: "INC의 최신 공지사항과 주요 안내를 확인할 수 있습니다.",
    type: "website",
  },
};

export default function NoticeLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이벤트",
  description: "INC의 행사, 세미나, 프로그램 및 주요 이벤트 정보를 확인할 수 있습니다.",
  openGraph: {
    title: "이벤트 | INC",
    description: "INC의 행사, 세미나, 프로그램 및 주요 이벤트 정보를 확인할 수 있습니다.",
    type: "website",
  },
};

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

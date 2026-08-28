import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "자료실",
  description:
    "INC의 ATM, Heartbeat of Atoms, 강연자료, 세미나, 보고서, 공모전 자료 등을 확인할 수 있습니다.",
  openGraph: {
    title: "자료실 | INC",
    description:
      "INC의 원자력 연구 및 국제 협력 관련 자료를 카테고리별로 확인할 수 있습니다.",
    type: "website",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

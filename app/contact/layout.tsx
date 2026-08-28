import { makeMetadata } from "@/lib/seo";

export const metadata = makeMetadata({
  title: "문의 및 오시는 길",
  description:
    "INC 연락처와 위치, 문의 방법을 확인할 수 있습니다.",
  path: "/contact",
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}

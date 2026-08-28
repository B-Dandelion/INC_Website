import { makeMetadata } from "@/lib/seo";

export const metadata = makeMetadata({
  title: "INC 소개",
  description:
    "INC(International Nuclear Cooperation)의 활동과 원자력 연구·국제 협력 네트워크를 소개합니다.",
  path: "/about",
});

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}

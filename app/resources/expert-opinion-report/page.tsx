import DocumentBoardPage from "@/components/resources/DocumentBoardPage";
import { makeMetadata } from "@/lib/seo";

export const metadata = makeMetadata({
  title: "전문가 의견 보고서",
  description: "원자력 수출·비확산·국제협력 분야 전문가 의견 보고서 원문 모음입니다.",
  path: "/resources/expert-opinion-report",
});

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  return (
    <DocumentBoardPage
      slug="expert-opinion-report"
      title="전문가 의견 보고서"
      titleEn="Expert Opinion Reports"
      description="전문가 의견 보고서 원문을 확인할 수 있습니다. 자료를 누르면 새 창에서 열립니다."
      descriptionEn="Expert opinion reports. Each document opens in a new tab."
      page={page}
      q={typeof sp.q === "string" ? sp.q : ""}
    />
  );
}

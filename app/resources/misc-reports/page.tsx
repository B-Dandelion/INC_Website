import DocumentBoardPage from "@/components/resources/DocumentBoardPage";
import { makeMetadata } from "@/lib/seo";

export const metadata = makeMetadata({
  title: "기타 보고서",
  description: "INC가 발간·수집한 원자력 관련 보고서 원문 모음입니다.",
  path: "/resources/misc-reports",
});

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  return (
    <DocumentBoardPage
      slug="misc-reports"
      title="기타 보고서"
      titleEn="Other Reports"
      description="기타 보고서 원문을 확인할 수 있습니다. 자료를 누르면 새 창에서 열립니다."
      descriptionEn="Other reports. Each document opens in a new tab."
      page={page}
      q={typeof sp.q === "string" ? sp.q : ""}
    />
  );
}

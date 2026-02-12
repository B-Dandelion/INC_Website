import SimpleListPage from "@/components/resources/SimpleListPage";

export default async function LecturesPage() {
  return (
    <SimpleListPage
      activeKey="lectures"
      title="강연자료"
      prefix="lectures"   // <- DB source_path prefix로 맞춰
      hint="제목 클릭 시 파일이 새 창으로 열립니다."
    />
  );
}

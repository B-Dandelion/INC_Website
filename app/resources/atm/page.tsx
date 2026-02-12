import SimpleListPage from "@/components/resources/SimpleListPage";

function guessIssue(title: string) {
  // "ATM No. 12", "12호", "12" 같은 케이스 대충 대응
  const m = title.match(/\bNo\.?\s*(\d{1,4})\b/i);
  return m ? `No. ${m[1]}` : "";
}

export default async function ATMPage() {
  return (
    <SimpleListPage
      activeKey="atm"
      title="ATM"
      prefix="atm"
      hint="제목 클릭 시 파일이 새 창으로 열립니다."
      rightMetaFromTitle={guessIssue}
    />
  );
}

적용 파일

1. components/admin/AdminEventDetailClient.tsx
   - 포스터 신규 업로드/교체에서 이미지와 PDF 허용
   - 자료 삭제 시 event_assets 연결도 함께 제거

2. app/api/admin/event-assets/add/route.ts
   - 국문/영문 포스터가 이미 연결돼 있으면 새 행 insert 대신 기존 연결 갱신
   - 기존 stale event_assets 때문에 발생하는 unique constraint 오류 복구

3. app/api/admin/resources/replace/route.ts
   - 포스터는 이미지 ↔ PDF 형식 변경 교체 허용
   - 다른 자료는 기존처럼 동일 kind끼리만 교체

4. app/resources/shortform-contest/page.tsx
   - 행사 선택 링크의 /resources/shortform 404 경로 수정
   - PDF 포스터는 이미지 태그 대신 PDF 열기 버튼으로 표시

적용 후:
npm run build
npm run dev

# INC Product Analytics Portfolio

Issue: #10

## Goal
현재 존재하는 익명 사이트 analytics를 **검색 품질과 자료 발견 성공 여부를 설명하는 Product Analytics**로 발전시킨다.

## Current instrumentation confirmed in code
- `page_view`
- `search`
- `login`
- `signup`
- server-side `download`
- visitor_id
- path / resource_id
- search_query
- referrer_host
- device_type
- 관리자 analytics dashboard

## Phase 1 implementation on this branch
검색 이벤트에 다음 metadata를 추가한다.

- `result_count`
- `resource_count`
- `notice_count`
- `event_count`
- `zero_result`

### Why
기존에는 검색어와 검색 횟수만 알 수 있어 다음 질문에 답하기 어렵다.

- 어떤 검색어가 결과를 찾지 못했는가?
- 검색 결과가 자료/공지/행사 중 어디에 분포하는가?
- zero-result rate가 개선 전후로 변했는가?

새 metadata가 누적되면 **검색 성공률 개선**을 실제 서비스 metric으로 추적할 수 있다.

## Code changes
- `components/SearchAnalytics.tsx`
  - server-rendered 검색 결과 개수를 받아 search event를 기록
- `components/SiteAnalytics.tsx`
  - global component에서 중복 search event 기록 제거
- `lib/siteAnalyticsClient.ts`
  - result counts 전송 지원
- `app/api/analytics/event/route.ts`
  - count 검증 후 metadata에 저장
- `app/search/page.tsx`
  - 실제 검색 결과 count를 analytics component에 전달

## Privacy / quality
- 관리자 경로는 기존대로 수집하지 않는다.
- Do Not Track 설정을 기존대로 존중한다.
- count 값은 0~10,000 정수만 허용한다.
- raw search query는 기존 시스템에서 이미 저장하고 있으므로, 향후 retention / normalization 정책을 별도로 검토한다.

## Next steps
1. INC production Supabase 프로젝트 접근 확보
2. `record_site_analytics_event`가 metadata JSON을 저장하는지 확인
3. search event의 result_count 누적 확인
4. zero-result rate / top failed queries dashboard 추가
5. search result click event를 추가해 검색→클릭→자료 이용 funnel 구축
6. semantic search PoC는 baseline metric이 쌓인 뒤 진행

## Portfolio question
**“사용자는 원하는 자료를 찾고 있는가?”**

이 질문에 대해:
- search count
- zero-result rate
- click-through rate
- resource use conversion
- top failed queries

를 순서대로 분석하고, 메타데이터/검색 개선 전후를 비교하는 case study를 만든다.

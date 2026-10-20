# Search Analytics Measurement Plan

## Primary metrics

### Zero-result rate
```text
zero_result_rate = searches with result_count = 0 / all searches
```

### Search result click-through rate
추후 `search_result_click` 이벤트가 구현되면:

```text
search_ctr = searches followed by result click / all searches
```

### Search-to-resource-use conversion
검색 후 일정 시간 내 `download` 또는 자료 열기가 발생한 비율.

## Segments
- device_type
- referrer_host
- result type: resource / notice / event
- query normalization bucket
- time period

## Interpretation rules
- 검색 건수가 작은 query는 개별 결론을 내리지 않는다.
- zero-result는 검색 품질 문제뿐 아니라 실제 콘텐츠 부재일 수 있다.
- 검색 개선 효과는 배포 전/후 같은 기간 길이로 비교하고 전체 traffic 변화도 함께 본다.
- semantic search 실험 전 keyword baseline을 먼저 고정한다.

## AI/NLP extension
1. 실제 검색어에서 평가 query set 작성
2. 정답 문서 relevance label을 수동으로 작은 규모부터 구축
3. keyword baseline 평가
4. embedding retrieval PoC
5. Precision@K / Recall@K / MRR 비교
6. 실제 zero-result / click / resource-use metric으로 online 검증

# External API Contract: cataas (Cat as a Service)

**검증일**: 2026-07-13 (PowerShell `Invoke-WebRequest` 실측) | **소유**: 외부 서비스 (통제 불가)

## 1. 고양이 목록 조회

사용자 지정 엔드포인트(스펙 Assumptions). 쿼리 변형 없이 그대로 호출한다.

```text
GET https://cataas.com/api/cats?tags=cute
```

### 성공 응답 (실측)

- Status: `200 OK`
- Headers: `Content-Type: application/json`, `Access-Control-Allow-Origin: *`
  (브라우저 교차 출처 fetch 허용 — 프록시 불필요)
- Body: 고양이 객체 배열, 파라미터 없이 호출 시 기본 **10건**

```json
[
  {
    "id": "0F0IKAPOdWiE755P",
    "tags": ["meet", "cute"],
    "mimetype": "image/jpeg",
    "createdAt": "2024-06-18T09:46:45.702Z"
  },
  {
    "id": "0GC9MRUAqxhBzPyA",
    "tags": ["cute"],
    "mimetype": "image/png",
    "createdAt": "2024-09-15T15:45:25.375Z"
  }
]
```

앱이 사용하는 필드는 `id`뿐이다. 나머지 필드는 무시하되, 테스트 모의 응답에는
실측 구조 전체를 포함한다(헌법 I 모킹 규칙).

## 2. 이미지 조회

```text
GET https://cataas.com/cat/{id}
```

- Status: `200 OK`, `Content-Type: image/jpeg` 등 바이너리 (실측 약 107KB)
- **주의**: HEAD 메서드는 `404`를 반환한다(실측). 존재 확인은 `<img>` 로드
  이벤트로만 판단한다.
- 사용 방식: `<img src="https://cataas.com/cat/{id}">` — `onLoad`/`onError`로
  성공·실패 판정

## 3. 실패 모드와 앱 반응 (FR-006)

| 실패 모드 | 감지 지점 | 앱 반응 |
| --- | --- | --- |
| 네트워크 오류·타임아웃 | `fetch` reject | error 상태 → 커버 숨김 |
| HTTP 4xx/5xx | `response.ok === false` | error 상태 → 커버 숨김 |
| JSON 파싱 실패 | `response.json()` reject | error 상태 → 커버 숨김 |
| 빈 배열 / 배열 아님 / id 없는 항목뿐 | `pickRandomCatUrl` → `null` | error 상태 → 커버 숨김 |
| 이미지 자체 로드 실패 | `<img>` `onError` | error 상태 → 커버 숨김 (깨진 이미지 노출 금지) |
| 글 전환으로 요청 취소 | `AbortError` | 상태 변경 없음 (오류 아님 — 새 요청이 진행 중) |

모든 실패는 조용히 처리하며(clarify Q2) 편집 기능에 영향을 주지 않는다(SC-004).

## 4. 계약 변경 리스크

- 외부 서비스이므로 스키마가 예고 없이 바뀔 수 있다(과거 `_id` → `id` 변경 이력).
- 방어: 앱은 `id: string` 하나에만 의존하고, 형태가 어긋나면 전부 "커버 숨김"으로
  수렴하므로 스키마 변경이 편집 기능을 깨뜨리지 않는다.

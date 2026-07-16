# Contract: 마이페이지 자기소개 UI

**Feature**: 002-profile-introduction | **Type**: 화면 계약 (`app/(app)/mypage/page.tsx`)

DESIGN.md §4.6(마이 페이지)의 기존 리터럴을 따른다. 신규 확정 값은 구현 커밋에서
DESIGN.md §4.6에 추가한다(원칙 V).

## 배치

기존 필드 순서: 별명 입력 → 이메일 입력(비활성) → **자기소개(신규)** → 저장 버튼 행.

- 필드 라벨 `자기소개`: 기존 라벨 스타일 그대로 (`font-size: 13px; color: var(--text-secondary); font-weight: 500; margin-bottom: 6px`)
- 입력: `<textarea class="nk-inp">` — 별명 입력과 동일 보더·radius·padding·폰트
  (`border: 1px solid var(--border-strong); border-radius: var(--radius-sm); padding: 9px 11px; font-size: 14px`),
  여러 줄: `min-height: 120px; resize: none; line-height: 1.6` (신규 값 — DESIGN.md에 기록),
  `margin-bottom: 6px` (아래 카운터 행과의 간격)
- 카운터: textarea 아래 우측 정렬, `{countChars(값)}/500자` —
  `font-size: 12px; color: var(--text-tertiary)`, 500자 초과 상태(레거시)면 `color: var(--text-danger)`
- 이메일 입력의 `margin-bottom: 30px`은 자기소개 블록 아래로 이동 상당
  (최종 여백 구성은 DESIGN.md 갱신에 기록)

## 상태와 문자열 (전부 한국어 — 원칙 III)

| 상태 | 표시 |
| --- | --- |
| 로딩 (`store.loaded && intro settle` 전) | 기존 마이페이지 로딩 화면 그대로 (`<div style="flex:1; background: var(--surface-base)">`) — 폼 미표시 |
| 미등록 (ready, 값 없음) | 빈 textarea + placeholder `자신을 소개하는 글을 남겨보세요` |
| 등록됨 (ready, 값 있음) | textarea에 저장본 그대로 (줄바꿈·이모지 보존, 500자 초과 레거시도 전체 표시) |
| 불러오기 실패 (load-error) | textarea `disabled` + 오류 문구 `자기소개를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.` (`font-size: 13px; color: var(--text-danger)`) — placeholder 문구는 표시하지 않음 |
| 저장 성공 | 기존 확인 문구 `저장되었습니다 ✓` (flash, 1.5초 — 기존 동작 재사용) |
| 저장 실패 | 버튼 우측에 `저장에 실패했습니다. 잠시 후 다시 시도해 주세요.` (`font-size: 13px; color: var(--text-danger)`), 입력값 유지. 다음 저장 시도 시 문구 제거 |
| 500자 초과 상태에서 저장 시도 | 요청 없이 `자기소개는 500자까지 저장할 수 있어요.` (동일 오류 문구 자리) |

## 동작 계약

1. 마운트 시 `GET /api/profile/introduction` 1회 → settle 후에만 폼 렌더 (덮어쓰기 경로 원천 차단)
2. 입력 가드: 변경 후 값이 `countChars ≤ 500` **또는** 현재보다 짧아지면 수용, 아니면 무시
3. "변경 사항 저장" 클릭 → `PUT` → 성공 시에만 기존 `flash()` 호출, 실패 시 오류 문구
4. 별명·이메일·아바타 관련 기존 동작(즉시 반영, disabled 등)은 코드 경로 불변 (FR-009)
5. 미등록 저장: trim-빈 값이면 `introduction: null`로 전송

## UI 테스트 (page.test.tsx — RTL, `/api` fetch만 모킹)

1. 로딩 게이트: GET 응답 전 폼 미표시 → 응답 후 표시
2. 미등록: placeholder 노출 / 등록됨: 저장본 표시 (줄바꿈 보존)
3. 등록 흐름: 입력 → 저장 클릭 → PUT 본문 검증 → `저장되었습니다 ✓` 표시
4. 수정 흐름: 기존 값 수정 저장 / 전부 지우고 저장 → `introduction: null` 전송
5. 저장 실패: 오류 문구 표시 + textarea 값 유지 → 재시도 성공 시 확인 표시
6. 불러오기 실패: 오류 문구 + textarea disabled + placeholder 부재
7. 카운터: 값 변경에 따라 `N/500자` 갱신 (grapheme — 이모지 1자)
8. 500자 가드: 500자에서 추가 입력 무시 / 레거시 600자 표시 + 짧아지는 편집 허용 + 저장 거부 문구
9. 무회귀: 별명 입력 변경이 기존처럼 즉시 반영 (스토어 setNickname 경로)

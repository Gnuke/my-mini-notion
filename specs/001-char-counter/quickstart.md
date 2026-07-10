# Quickstart: 본문 글자 수 카운터 검증 가이드

**Feature**: 001-char-counter | **Date**: 2026-07-10

구현이 [스펙](./spec.md)과 [UI 계약](./contracts/char-counter-ui.md)을 만족하는지
end-to-end로 확인하는 절차.

## 사전 준비

```powershell
npm install        # 최초 1회
```

## 1. 자동 테스트 (원칙 I 게이트)

```powershell
npm test
```

**기대 결과**: 전체 통과, 에러·경고 없음. 다음 테스트가 포함되어야 한다:

- `lib/chars.test.ts` — [계약 C2](./contracts/char-counter-ui.md) 표의 전 케이스
  (빈 문자열, 한글, 공백, 줄바꿈, 😀, 👨‍👩‍👧, 🇰🇷)
- `components/Editor.test.tsx` — 카운터 표시(C1), 입력 시 갱신(C3), 제목 입력 시
  불변(C3), 글 전환 시 갱신(C3)

## 2. 수동 검증 (개발 서버)

```powershell
npm run dev        # http://localhost:3000
```

로그인 화면에서 `구글로 로그인` 클릭 후:

| # | 시나리오 (스펙 Acceptance) | 기대 결과 |
| --- | --- | --- |
| 1 | 새 글 생성 (`＋ 새 글`) | 에디터 우측 하단에 `0자` 배지 표시 |
| 2 | 본문에 `안녕하세요` 입력 | 배지가 즉시 `5자`로 갱신 |
| 3 | 일부 삭제 (`요` 지움) | 즉시 `4자`로 감소 |
| 4 | 긴 텍스트 붙여넣기 | 전체 글자 수로 즉시 갱신 |
| 5 | **제목**에 텍스트 입력 | 글자 수 **불변** |
| 6 | 본문을 길게 만들어 스크롤 | 스크롤해도 배지가 우측 하단에 계속 보임 |
| 7 | 목록에서 다른 글 클릭 | 새 글의 본문 글자 수로 즉시 교체 |
| 8 | 모든 글 삭제 → 빈 상태 화면 | 배지가 화면에 없음 |
| 9 | 본문에 `😀`, `👨‍👩‍👧`, `🇰🇷` 입력 | 각각 1자로 계산 (합계 3자) |
| 10 | 수만 자 텍스트 붙여넣고 타이핑 | 입력 지연 체감 없음 (SC-003) |

## 3. 문서 동기화 확인 (원칙 V 게이트)

- [ ] `DESIGN.md` §4.3(Editor)에 글자 수 배지 명세(위치·offset·배경·보더·radius·
      폰트 크기·색·pointer-events)가 추가되어 있는가?
- [ ] 배지 스타일 값이 [research R3](./research.md)의 결정(기존 토큰·coverBtnStyle
      패턴)과 일치하는가?

## 참조

- 계산 규칙·형식: [contracts/char-counter-ui.md](./contracts/char-counter-ui.md)
- 파생 값 정의: [data-model.md](./data-model.md)
- 기술 결정 근거: [research.md](./research.md)

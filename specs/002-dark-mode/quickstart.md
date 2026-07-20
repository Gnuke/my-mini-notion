# Quickstart: 다크 모드 검증 (002-dark-mode)

**Plan**: [plan.md](./plan.md) | **Contract**: [contracts/theme-contract.md](./contracts/theme-contract.md)

## 준비물

- Node.js + `npm install` 완료 상태
- 크로미움 계열 브라우저 (localStorage 조작은 DevTools 사용)

## 1. 자동 테스트

```bash
npm test
```

**기대 결과**: 전체 통과, 에러·경고 없음. 테마 관련 스위트:

- `lib/theme.test.ts` — 기본 다크(FR-004), 저장값 복원(FR-005), 무효값
  다크 폴백(FR-006), applyTheme의 DOM·저장소 반영
- `components/PostList.test.tsx` — 헤더 토글 렌더(FR-002), 클릭 반전
  (FR-002·003), 한국어 라벨 전환(FR-008)

## 2. 수동 검증 시나리오 (dev 서버)

```bash
npm run dev   # http://localhost:3000
```

### S1. 첫 방문 기본 다크 (SC-001, US2)

1. DevTools → Application → Local Storage에서 `nook-theme` 삭제
2. 새로고침
3. **기대**: 로그인 화면(미로그인 시)과 앱 전체가 다크로 표시. OS가 라이트
   테마여도 다크

### S2. 토글 전환 (SC-002, US1)

1. 로그인 후 글 목록 패널 헤더의 토글 버튼(해 아이콘) 클릭
2. **기대**: 새로고침 없이 즉시 전 영역(레일·목록·에디터) 라이트 전환,
   아이콘이 달 모양으로, 툴팁이 `다크 모드로 전환`으로 변경
3. 재클릭 → 다크 원복

### S3. 선택 유지 (SC-003, US3)

1. 라이트로 전환 → 탭 닫기 → 재접속
2. **기대**: 라이트로 표시, `nook-theme` = `"light"`
3. 다크로 전환 후 반복 → 다크 유지

### S4. 깜빡임 없음 (SC-004)

1. `nook-theme` = `"light"` 상태에서 강력 새로고침(Ctrl+Shift+R) 수 회
2. **기대**: 로드 순간 다크가 스쳐 보이지 않음 (DevTools Performance 탭
   느린 CPU 스로틀링으로 재확인 가능)
3. 저장값 삭제 후 반복 → 라이트가 스쳐 보이지 않음

### S5. 무효 저장값 폴백 (FR-006)

1. DevTools 콘솔: `localStorage.setItem("nook-theme", "banana")`
2. 새로고침
3. **기대**: 다크로 표시. 토글은 정상 동작

### S6. 가독성·과업 완료 (SC-005, FR-009)

두 모드 각각에서:

1. 로그인 → 글 선택 → 제목·본문 수정(자동 저장 표시 확인) → 삭제 팝오버
   → 취소 → 글자 수 배지·커버 버튼 판독 확인
2. **기대**: 모든 텍스트·버튼·배지가 배경과 명확히 구분되어 읽힘.
   특히 다크에서: 선택 행(딤 블루), 아바타 이니셜, 삭제 hover, 글자 수 배지,
   스크롤바

## 3. 문서 동기화 확인 (헌법 II·V)

- `DESIGN.md`에 다크 팔레트 표(research.md R4·R5 값과 문자 그대로 일치),
  토글 버튼 명세, 신규 토큰 3개·아이콘 2종이 기록되어 있는지 대조
- `globals.css`의 `html[data-theme="dark"]` 블록 값과 DESIGN.md 표 값이
  1:1인지 대조

// 기존 코드에 대한 테스트 — 테스트 하네스 검증을 겸한다 (실제 코드, 모킹 없음).
import { describe, expect, test } from "vitest";
import { rel } from "@/lib/data";

const MIN = 60000;
const H = 3600000;
const D = 86400000;

describe("rel — 상대 시간 라벨", () => {
  test("1분 미만이면 '방금'을 반환한다", () => {
    expect(rel(Date.now() - 5000)).toBe("방금");
  });

  test("1시간 미만이면 분 단위 라벨을 반환한다", () => {
    expect(rel(Date.now() - 3 * MIN)).toBe("3분 전");
  });

  test("하루 미만이면 시간 단위 라벨을 반환한다", () => {
    expect(rel(Date.now() - 2 * H)).toBe("2시간 전");
  });

  test("7일 미만이면 일 단위 라벨을 반환한다", () => {
    expect(rel(Date.now() - 2 * D)).toBe("2일 전");
  });

  test("7일 이상 지났으면 '월 일' 형식을 반환한다", () => {
    expect(rel(new Date(2026, 0, 15).getTime())).toBe("1월 15일");
  });
});

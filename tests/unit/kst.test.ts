import { describe, expect, it } from "vitest";
import {
  getKstDateEnd,
  getKstDateStart,
  toKstIsoString
} from "../../shared/kst";

describe("KST 날짜 처리", () => {
  it("시각을 +09:00 형식으로 표시한다", () => {
    const date = new Date("2026-08-14T15:30:00.000Z");

    expect(toKstIsoString(date)).toBe(
      "2026-08-15T00:30:00.000+09:00"
    );
  });

  it("KST 날짜의 시작과 종료 경계를 정확히 계산한다", () => {
    expect(toKstIsoString(getKstDateStart("2026-08-15"))).toBe(
      "2026-08-15T00:00:00.000+09:00"
    );
    expect(toKstIsoString(getKstDateEnd("2026-08-15"))).toBe(
      "2026-08-15T23:59:59.999+09:00"
    );
  });

  it("잘못된 날짜 형식과 존재하지 않는 날짜를 거부한다", () => {
    expect(() => getKstDateStart("2026/08/15")).toThrow();
    expect(() => getKstDateStart("2026-02-31")).toThrow();
  });
});

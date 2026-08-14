import { describe, expect, it } from "vitest";
import {
  passwordResetConfirmSchema,
  strongPasswordSchema
} from "../../shared/validators/auth";

describe("비밀번호 정책", () => {
  it("대문자·소문자·숫자·특수문자를 포함한 12자 이상 비밀번호를 허용한다", () => {
    expect(strongPasswordSchema.safeParse("ValidPassword!123").success).toBe(
      true
    );
  });

  it("필수 문자 종류가 없거나 짧은 비밀번호를 거부한다", () => {
    expect(strongPasswordSchema.safeParse("short").success).toBe(false);
    expect(strongPasswordSchema.safeParse("lowercase123!").success).toBe(false);
    expect(strongPasswordSchema.safeParse("UPPERCASE123!").success).toBe(false);
    expect(strongPasswordSchema.safeParse("NoNumbersHere!").success).toBe(false);
  });

  it("재설정 토큰은 64자리 소문자 16진수만 허용한다", () => {
    expect(
      passwordResetConfirmSchema.safeParse({
        token: "a".repeat(64),
        password: "ValidPassword!123"
      }).success
    ).toBe(true);

    expect(
      passwordResetConfirmSchema.safeParse({
        token: "A".repeat(64),
        password: "ValidPassword!123"
      }).success
    ).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  hashPassword,
  normalizeEmail,
  verifyPassword
} from "../../server/services/auth/password";

describe("관리자 비밀번호 처리", () => {
  it("이메일의 공백과 대소문자를 정규화한다", () => {
    expect(normalizeEmail("  Admin@Example.COM ")).toBe("admin@example.com");
  });

  it("비밀번호를 원문과 다른 해시로 저장하고 검증한다", async () => {
    const password = "ValidPassword!123";
    const passwordHash = await hashPassword(password);

    expect(passwordHash).not.toBe(password);
    expect(await verifyPassword(password, passwordHash)).toBe(true);
    expect(await verifyPassword("WrongPassword!123", passwordHash)).toBe(false);
  });
});

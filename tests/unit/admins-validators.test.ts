import { describe, expect, it } from "vitest";
import {
  adminCreateSchema,
  adminListQuerySchema,
  adminUpdateSchema
} from "../../shared/validators/admins";

describe("관리자 입력 검증", () => {
  it("목록 조회의 기본 페이지 값을 설정한다", () => {
    const result = adminListQuerySchema.parse({});

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it("올바른 관리자 등록 정보를 허용한다", () => {
    const result = adminCreateSchema.parse({
      email: "admin@example.com",
      name: "관리자"
    });

    expect(result.role).toBe("admin");
  });

  it("잘못된 이메일을 거부한다", () => {
    expect(
      adminCreateSchema.safeParse({
        email: "invalid-email",
        name: "관리자"
      }).success
    ).toBe(false);
  });

  it("허용되지 않은 역할을 거부한다", () => {
    expect(
      adminCreateSchema.safeParse({
        email: "admin@example.com",
        name: "관리자",
        role: "owner"
      }).success
    ).toBe(false);
  });

  it("수정 항목이 없는 요청을 거부한다", () => {
    expect(adminUpdateSchema.safeParse({}).success).toBe(false);
  });

  it("잠금 상태를 관리자 수정 요청으로 직접 지정할 수 없다", () => {
    expect(
      adminUpdateSchema.safeParse({
        status: "locked"
      }).success
    ).toBe(false);
  });
});

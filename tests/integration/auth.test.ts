import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../server/app";

describe("관리자 인증 API 기본 동작", () => {
  it("로그인 입력값이 없으면 DB 조회 전에 400을 반환한다", async () => {
    const response = await request(createApp())
      .post("/api/auth/login")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_LOGIN_INPUT");
  });

  it("세션 쿠키가 없으면 내 정보 요청에 401을 반환한다", async () => {
    const response = await request(createApp()).get("/api/auth/me");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        code: "NOT_AUTHENTICATED",
        message: "로그인이 필요합니다."
      }
    });
  });

  it("이미 로그아웃 상태여도 로그아웃 요청은 안전하게 성공한다", async () => {
    const response = await request(createApp()).post("/api/auth/logout");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
  });
});


describe("비밀번호 재설정 API 입력 검증", () => {
  it("잘못된 이메일 형식은 발송 전에 거부한다", async () => {
    const response = await request(createApp())
      .post("/api/auth/forgot-password")
      .send({ email: "not-an-email" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_RESET_REQUEST");
  });

  it("잘못된 토큰 형식은 비밀번호 변경 전에 거부한다", async () => {
    const response = await request(createApp())
      .post("/api/auth/reset-password")
      .send({
        token: "invalid-token",
        password: "ValidPassword!123"
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_RESET_INPUT");
  });
});


describe("권한 조회 API", () => {
  it("로그인하지 않은 권한 조회는 401을 반환한다", async () => {
    const response = await request(createApp()).get(
      "/api/auth/permissions"
    );

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("NOT_AUTHENTICATED");
  });
});

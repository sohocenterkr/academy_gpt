import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../server/app";

const sampleId = "11111111-1111-4111-8111-111111111111";

describe("관리자 계정 API 인증 경계", () => {
  it("로그인하지 않으면 관리자 목록을 조회할 수 없다", async () => {
    const response = await request(createApp()).get("/api/admins");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("NOT_AUTHENTICATED");
  });

  it("로그인하지 않으면 관리자를 등록할 수 없다", async () => {
    const response = await request(createApp())
      .post("/api/admins")
      .send({
        email: "admin@example.com",
        name: "관리자",
        role: "admin"
      });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("NOT_AUTHENTICATED");
  });

  it("로그인하지 않으면 관리자 정보를 수정할 수 없다", async () => {
    const response = await request(createApp())
      .patch(`/api/admins/${sampleId}`)
      .send({ name: "변경된 관리자" });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("NOT_AUTHENTICATED");
  });

  it("로그인하지 않으면 재설정 메일을 발송할 수 없다", async () => {
    const response = await request(createApp())
      .post(`/api/admins/${sampleId}/send-reset`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("NOT_AUTHENTICATED");
  });
});

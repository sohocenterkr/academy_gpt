import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../server/app";

describe("학사 기준정보 API 인증 경계", () => {
  it("로그인하지 않으면 학교 목록을 조회할 수 없다", async () => {
    const response = await request(createApp()).get("/api/schools");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("NOT_AUTHENTICATED");
  });

  it("로그인하지 않으면 학교를 등록할 수 없다", async () => {
    const response = await request(createApp())
      .post("/api/schools")
      .send({ name: "테스트학교" });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("NOT_AUTHENTICATED");
  });

  it("로그인하지 않으면 학년 목록을 조회할 수 없다", async () => {
    const response = await request(createApp()).get(
      "/api/grade-levels"
    );

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("NOT_AUTHENTICATED");
  });

  it("로그인하지 않으면 학원 기본정보를 조회할 수 없다", async () => {
    const response = await request(createApp()).get(
      "/api/settings/academy"
    );

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("NOT_AUTHENTICATED");
  });

  it("로그인하지 않으면 학원 기본정보를 수정할 수 없다", async () => {
    const response = await request(createApp())
      .patch("/api/settings/academy")
      .send({ academyName: "테스트학원" });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("NOT_AUTHENTICATED");
  });
});

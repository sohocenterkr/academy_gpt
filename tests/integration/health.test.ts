import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../server/app";

describe("기본 API", () => {
  it("GET /api/health는 정상 상태를 반환한다", async () => {
    const response = await request(createApp()).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: "ok",
      service: "academy-gpt",
      timezone: "Asia/Seoul"
    });
    expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}\+09:00$/);
  });

  it("존재하지 않는 API는 표준 404 오류를 반환한다", async () => {
    const response = await request(createApp()).get("/api/not-found");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: "API_NOT_FOUND",
        message: "요청한 API를 찾을 수 없습니다."
      }
    });
  });
});

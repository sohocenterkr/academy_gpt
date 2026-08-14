import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../server/app";

describe("감사기록 API 권한", () => {
  it("로그인하지 않은 사용자는 감사기록을 조회할 수 없다", async () => {
    const response = await request(createApp()).get("/api/audit-logs");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("NOT_AUTHENTICATED");
  });
});

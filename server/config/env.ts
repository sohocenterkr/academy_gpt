import { z } from "zod";

const databaseEnvSchema = z.object({
  DATABASE_URL: z
    .string({ error: "DATABASE_URL이 필요합니다." })
    .min(1, "DATABASE_URL이 비어 있습니다.")
});

const authEnvSchema = databaseEnvSchema.extend({
  AUTH_SESSION_SECRET: z
    .string({ error: "AUTH_SESSION_SECRET이 필요합니다." })
    .min(64, "AUTH_SESSION_SECRET은 64자 이상이어야 합니다.")
});

const initialAdminEnvSchema = authEnvSchema.extend({
  INITIAL_ADMIN_EMAIL: z
    .email("INITIAL_ADMIN_EMAIL 형식이 올바르지 않습니다."),
  INITIAL_ADMIN_PASSWORD: z
    .string({ error: "INITIAL_ADMIN_PASSWORD가 필요합니다." })
    .min(12, "초기 관리자 비밀번호는 12자 이상이어야 합니다.")
    .max(128, "초기 관리자 비밀번호는 128자 이하여야 합니다.")
    .regex(/[a-z]/, "초기 관리자 비밀번호에 영문 소문자가 필요합니다.")
    .regex(/[A-Z]/, "초기 관리자 비밀번호에 영문 대문자가 필요합니다.")
    .regex(/[0-9]/, "초기 관리자 비밀번호에 숫자가 필요합니다.")
    .regex(/[^A-Za-z0-9]/, "초기 관리자 비밀번호에 특수문자가 필요합니다."),
  INITIAL_ADMIN_NAME: z
    .string({ error: "INITIAL_ADMIN_NAME이 필요합니다." })
    .trim()
    .min(1, "초기 관리자 이름이 비어 있습니다.")
    .max(100, "초기 관리자 이름은 100자 이하여야 합니다.")
});

function formatEnvironmentError(error: z.ZodError): Error {
  const messages = error.issues.map((issue) => issue.message).join(" ");
  return new Error(`환경변수 설정 오류: ${messages}`);
}

export function getDatabaseEnv() {
  const result = databaseEnvSchema.safeParse(process.env);
  if (!result.success) {
    throw formatEnvironmentError(result.error);
  }
  return result.data;
}

export function getAuthEnv() {
  const result = authEnvSchema.safeParse(process.env);
  if (!result.success) {
    throw formatEnvironmentError(result.error);
  }
  return result.data;
}

export function getInitialAdminEnv() {
  const result = initialAdminEnvSchema.safeParse(process.env);
  if (!result.success) {
    throw formatEnvironmentError(result.error);
  }
  return result.data;
}

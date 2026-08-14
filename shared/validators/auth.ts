import { z } from "zod";

export const strongPasswordSchema = z
  .string()
  .min(12, "비밀번호는 12자 이상이어야 합니다.")
  .max(128, "비밀번호는 128자 이하여야 합니다.")
  .regex(/[a-z]/, "비밀번호에 영문 소문자가 필요합니다.")
  .regex(/[A-Z]/, "비밀번호에 영문 대문자가 필요합니다.")
  .regex(/[0-9]/, "비밀번호에 숫자가 필요합니다.")
  .regex(/[^A-Za-z0-9]/, "비밀번호에 특수문자가 필요합니다.");

export const passwordResetRequestSchema = z.object({
  email: z.email("올바른 이메일을 입력해 주세요.")
});

export const passwordResetConfirmSchema = z.object({
  token: z
    .string()
    .regex(/^[a-f0-9]{64}$/, "재설정 링크가 올바르지 않습니다."),
  password: strongPasswordSchema
});

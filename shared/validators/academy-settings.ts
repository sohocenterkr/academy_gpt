import { z } from "zod";

const settingsMapSchema = z
  .record(
    z.string().trim().min(1).max(50),
    z.string().trim().max(100)
  )
  .refine((value) => Object.keys(value).length <= 20, {
    message: "설정 항목은 최대 20개까지 입력할 수 있습니다."
  });

export const academySettingsUpdateSchema = z
  .object({
    academyName: z.string().trim().min(1).max(150).optional(),
    phone: z.string().trim().min(1).max(30).optional(),
    address: z.string().trim().min(1).max(500).optional(),
    logoMediaId: z.string().uuid().nullable().optional(),
    senderName: z.string().trim().min(1).max(100).optional(),
    brandColors: settingsMapSchema.optional(),
    brandFonts: settingsMapSchema.optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "수정할 항목이 필요합니다."
  });

export function normalizePhone(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

export function isValidKoreanPhone(value: string): boolean {
  return /^0\d{8,10}$/.test(normalizePhone(value));
}

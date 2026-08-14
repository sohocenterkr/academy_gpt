import { z } from "zod";

const sortOrderSchema = z.number().int().min(0).max(9999);

const schoolNameSchema = z.string().trim().min(1).max(120);
const gradeNameSchema = z.string().trim().min(1).max(80);

const regionSchema = z
  .string()
  .trim()
  .max(120)
  .nullable()
  .optional();

export const schoolCreateSchema = z
  .object({
    name: schoolNameSchema,
    region: regionSchema,
    sortOrder: sortOrderSchema.default(0),
    isActive: z.boolean().default(true)
  })
  .strict();

export const schoolUpdateSchema = z
  .object({
    name: schoolNameSchema.optional(),
    region: regionSchema,
    sortOrder: sortOrderSchema.optional(),
    isActive: z.boolean().optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "수정할 항목이 필요합니다."
  });

export const gradeLevelCreateSchema = z
  .object({
    name: gradeNameSchema,
    sortOrder: sortOrderSchema.default(0),
    isActive: z.boolean().default(true)
  })
  .strict();

export const gradeLevelUpdateSchema = z
  .object({
    name: gradeNameSchema.optional(),
    sortOrder: sortOrderSchema.optional(),
    isActive: z.boolean().optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "수정할 항목이 필요합니다."
  });

export function cleanReferenceName(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
}

export function normalizeReferenceName(value: string): string {
  return cleanReferenceName(value).toLocaleLowerCase("ko-KR");
}

export function cleanOptionalRegion(
  value: string | null | undefined
): string | null {
  if (value == null) {
    return null;
  }

  const cleaned = cleanReferenceName(value);
  return cleaned || null;
}

import { z } from "zod";

export const adminRoleSchema = z.enum([
  "super_admin",
  "admin"
]);

export const adminStatusSchema = z.enum([
  "active",
  "inactive",
  "locked"
]);

export const adminListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  role: adminRoleSchema.optional(),
  status: adminStatusSchema.optional()
});

export const adminCreateSchema = z
  .object({
    email: z.string().trim().email().max(254),
    name: z.string().trim().min(1).max(100),
    role: adminRoleSchema.default("admin")
  })
  .strict();

export const adminUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    role: adminRoleSchema.optional(),
    status: z.enum(["active", "inactive"]).optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "수정할 항목이 필요합니다."
  });

export const adminIdSchema = z.string().uuid();

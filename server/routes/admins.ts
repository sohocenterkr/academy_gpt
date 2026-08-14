import { randomBytes } from "node:crypto";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  and,
  desc,
  eq,
  ilike,
  isNull,
  ne,
  or,
  sql,
  type SQL
} from "drizzle-orm";
import {
  admins,
  adminSessions,
  auditLogs
} from "../../shared/schema";
import { toKstIsoString } from "../../shared/kst";
import {
  adminCreateSchema,
  adminIdSchema,
  adminListQuerySchema,
  adminUpdateSchema
} from "../../shared/validators/admins";
import { getDatabase } from "../db";
import {
  getAuthenticatedLocals,
  requirePermission
} from "../middleware/auth";
import {
  hashPassword,
  normalizeEmail
} from "../services/auth/password";
import {
  createPasswordResetToken,
  invalidatePasswordResetToken
} from "../services/auth/password-reset";
import { sendPasswordResetEmail } from "../services/email/resend";

export const adminsRouter = Router();

const adminResetRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: {
      code: "ADMIN_RESET_RATE_LIMITED",
      message: "재설정 메일 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요."
    }
  }
});

function nullableKst(value: Date | null): string | null {
  return value ? toKstIsoString(value) : null;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}

adminsRouter.get(
  "/",
  requirePermission("administrators:view"),
  async (request, response, next) => {
    try {
      const parsed = adminListQuerySchema.safeParse(request.query);

      if (!parsed.success) {
        response.status(400).json({
          error: {
            code: "INVALID_ADMIN_QUERY",
            message: "관리자 조회 조건을 확인해 주세요."
          }
        });
        return;
      }

      const { page, pageSize, search, role, status } = parsed.data;
      const conditions: SQL[] = [isNull(admins.deletedAt)];

      if (search) {
        const searchCondition = or(
          ilike(admins.name, `%${search}%`),
          ilike(admins.email, `%${search}%`)
        );

        if (searchCondition) {
          conditions.push(searchCondition);
        }
      }

      if (role) {
        conditions.push(eq(admins.role, role));
      }

      if (status) {
        conditions.push(eq(admins.status, status));
      }

      const whereCondition = and(...conditions);
      const database = getDatabase();

      const [countResult] = await database
        .select({
          total: sql<number>`count(*)::int`
        })
        .from(admins)
        .where(whereCondition);

      const rows = await database
        .select({
          id: admins.id,
          email: admins.email,
          name: admins.name,
          role: admins.role,
          status: admins.status,
          failedLoginAttempts: admins.failedLoginAttempts,
          lockedUntil: admins.lockedUntil,
          lastLoginAt: admins.lastLoginAt,
          passwordChangedAt: admins.passwordChangedAt,
          createdAt: admins.createdAt,
          updatedAt: admins.updatedAt
        })
        .from(admins)
        .where(whereCondition)
        .orderBy(desc(admins.createdAt), desc(admins.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const total = countResult?.total ?? 0;

      response.status(200).json({
        items: rows.map((row) => ({
          ...row,
          lockedUntil: nullableKst(row.lockedUntil),
          lastLoginAt: nullableKst(row.lastLoginAt),
          passwordChangedAt: toKstIsoString(row.passwordChangedAt),
          createdAt: toKstIsoString(row.createdAt),
          updatedAt: toKstIsoString(row.updatedAt)
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      });
    } catch (error) {
      next(error);
    }
  }
);


adminsRouter.post(
  "/",
  requirePermission("administrators:manage"),
  async (request, response, next) => {
    const parsed = adminCreateSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        error: {
          code: "INVALID_ADMIN",
          message: "관리자 등록 정보를 확인해 주세요.",
          details: parsed.error.flatten()
        }
      });
      return;
    }

    try {
      const database = getDatabase();
      const actor = getAuthenticatedLocals(response.locals);
      const email = normalizeEmail(parsed.data.email);
      const unusablePassword = randomBytes(48).toString("hex");
      const passwordHash = await hashPassword(unusablePassword);

      const admin = await database.transaction(async (transaction) => {
        const [created] = await transaction
          .insert(admins)
          .values({
            email,
            name: parsed.data.name,
            passwordHash,
            role: parsed.data.role,
            status: "active"
          })
          .returning({
            id: admins.id,
            email: admins.email,
            name: admins.name,
            role: admins.role,
            status: admins.status,
            createdAt: admins.createdAt,
            updatedAt: admins.updatedAt
          });

        if (!created) {
          throw new Error("관리자 생성 결과를 확인할 수 없습니다.");
        }

        await transaction.insert(auditLogs).values({
          actorAdminId: actor.id,
          action: "ADMIN_CREATED",
          entityType: "admin",
          entityId: created.id,
          metadata: {
            email: created.email,
            name: created.name,
            role: created.role
          },
          ipAddress: request.ip,
          userAgent: request.get("user-agent")
        });

        return created;
      });

      let emailSent = false;
      let resetToken: string | undefined;

      try {
        const tokenResult = await createPasswordResetToken({
          adminId: admin.id,
          requestedIp: request.ip
        });
        resetToken = tokenResult.token;

        const resendId = await sendPasswordResetEmail({
          to: admin.email,
          adminName: admin.name,
          token: resetToken
        });

        emailSent = true;

        await database.insert(auditLogs).values({
          actorAdminId: actor.id,
          action: "ADMIN_INVITATION_EMAIL_SENT",
          entityType: "admin",
          entityId: admin.id,
          metadata: { resendId },
          ipAddress: request.ip,
          userAgent: request.get("user-agent")
        });
      } catch (emailError) {
        if (resetToken) {
          await invalidatePasswordResetToken(resetToken);
        }

        console.error("관리자 초대 이메일 발송 실패:", emailError);

        await database.insert(auditLogs).values({
          actorAdminId: actor.id,
          action: "ADMIN_INVITATION_EMAIL_FAILED",
          entityType: "admin",
          entityId: admin.id,
          metadata: { reason: "delivery_failed" },
          ipAddress: request.ip,
          userAgent: request.get("user-agent")
        });
      }

      response.status(201).json({
        item: {
          ...admin,
          createdAt: toKstIsoString(admin.createdAt),
          updatedAt: toKstIsoString(admin.updatedAt)
        },
        emailSent
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        response.status(409).json({
          error: {
            code: "ADMIN_EMAIL_ALREADY_EXISTS",
            message: "같은 이메일의 관리자가 이미 있습니다."
          }
        });
        return;
      }

      next(error);
    }
  }
);


adminsRouter.patch(
  "/:id",
  requirePermission("administrators:manage"),
  async (request, response, next) => {
    const idResult = adminIdSchema.safeParse(request.params.id);
    const bodyResult = adminUpdateSchema.safeParse(request.body);

    if (!idResult.success || !bodyResult.success) {
      response.status(400).json({
        error: {
          code: "INVALID_ADMIN",
          message: "관리자 수정 정보를 확인해 주세요."
        }
      });
      return;
    }

    try {
      const database = getDatabase();
      const actor = getAuthenticatedLocals(response.locals);
      const now = new Date();

      const result = await database.transaction(async (transaction) => {
        const [existing] = await transaction
          .select()
          .from(admins)
          .where(
            and(
              eq(admins.id, idResult.data),
              isNull(admins.deletedAt)
            )
          )
          .limit(1)
          .for("update");

        if (!existing) {
          return { kind: "not_found" as const };
        }

        const nextName = bodyResult.data.name ?? existing.name;
        const nextRole = bodyResult.data.role ?? existing.role;
        const nextStatus = bodyResult.data.status ?? existing.status;

        const removesActiveSuperAdmin =
          existing.role === "super_admin" &&
          existing.status === "active" &&
          (
            nextRole !== "super_admin" ||
            nextStatus !== "active"
          );

        if (removesActiveSuperAdmin) {
          const [countResult] = await transaction
            .select({
              total: sql<number>`count(*)::int`
            })
            .from(admins)
            .where(
              and(
                eq(admins.role, "super_admin"),
                eq(admins.status, "active"),
                isNull(admins.deletedAt),
                ne(admins.id, existing.id)
              )
            );

          if ((countResult?.total ?? 0) < 1) {
            return { kind: "last_super_admin" as const };
          }
        }

        const [updated] = await transaction
          .update(admins)
          .set({
            name: nextName,
            role: nextRole,
            status: nextStatus,
            failedLoginAttempts:
              nextStatus === "active"
                ? 0
                : existing.failedLoginAttempts,
            lockedUntil:
              nextStatus === "active"
                ? null
                : existing.lockedUntil,
            updatedAt: now
          })
          .where(eq(admins.id, existing.id))
          .returning({
            id: admins.id,
            email: admins.email,
            name: admins.name,
            role: admins.role,
            status: admins.status,
            failedLoginAttempts: admins.failedLoginAttempts,
            lockedUntil: admins.lockedUntil,
            lastLoginAt: admins.lastLoginAt,
            passwordChangedAt: admins.passwordChangedAt,
            createdAt: admins.createdAt,
            updatedAt: admins.updatedAt
          });

        if (!updated) {
          throw new Error("관리자 수정 결과를 확인할 수 없습니다.");
        }

        if (
          nextStatus === "inactive" ||
          nextRole !== existing.role
        ) {
          await transaction
            .update(adminSessions)
            .set({ revokedAt: now })
            .where(
              and(
                eq(adminSessions.adminId, existing.id),
                isNull(adminSessions.revokedAt)
              )
            );
        }

        let action = "ADMIN_UPDATED";

        if (
          existing.status !== "inactive" &&
          updated.status === "inactive"
        ) {
          action = "ADMIN_DEACTIVATED";
        } else if (
          existing.status !== "active" &&
          updated.status === "active"
        ) {
          action = "ADMIN_REACTIVATED";
        }

        await transaction.insert(auditLogs).values({
          actorAdminId: actor.id,
          action,
          entityType: "admin",
          entityId: updated.id,
          metadata: {
            before: {
              name: existing.name,
              role: existing.role,
              status: existing.status
            },
            after: {
              name: updated.name,
              role: updated.role,
              status: updated.status
            }
          },
          ipAddress: request.ip,
          userAgent: request.get("user-agent")
        });

        return {
          kind: "updated" as const,
          admin: updated
        };
      });

      if (result.kind === "not_found") {
        response.status(404).json({
          error: {
            code: "ADMIN_NOT_FOUND",
            message: "관리자를 찾을 수 없습니다."
          }
        });
        return;
      }

      if (result.kind === "last_super_admin") {
        response.status(409).json({
          error: {
            code: "LAST_ACTIVE_SUPER_ADMIN",
            message: "마지막 활성 최고관리자는 역할을 변경하거나 비활성화할 수 없습니다."
          }
        });
        return;
      }

      response.status(200).json({
        item: {
          ...result.admin,
          lockedUntil: nullableKst(result.admin.lockedUntil),
          lastLoginAt: nullableKst(result.admin.lastLoginAt),
          passwordChangedAt: toKstIsoString(
            result.admin.passwordChangedAt
          ),
          createdAt: toKstIsoString(result.admin.createdAt),
          updatedAt: toKstIsoString(result.admin.updatedAt)
        }
      });
    } catch (error) {
      next(error);
    }
  }
);


adminsRouter.post(
  "/:id/send-reset",
  requirePermission("administrators:manage"),
  adminResetRateLimiter,
  async (request, response, next) => {
    const idResult = adminIdSchema.safeParse(request.params.id);

    if (!idResult.success) {
      response.status(400).json({
        error: {
          code: "INVALID_ADMIN_ID",
          message: "관리자 식별값이 올바르지 않습니다."
        }
      });
      return;
    }

    try {
      const database = getDatabase();
      const actor = getAuthenticatedLocals(response.locals);
      const [target] = await database
        .select({
          id: admins.id,
          email: admins.email,
          name: admins.name,
          status: admins.status
        })
        .from(admins)
        .where(
          and(
            eq(admins.id, idResult.data),
            isNull(admins.deletedAt)
          )
        )
        .limit(1);

      if (!target) {
        response.status(404).json({
          error: {
            code: "ADMIN_NOT_FOUND",
            message: "관리자를 찾을 수 없습니다."
          }
        });
        return;
      }

      if (target.status === "inactive") {
        response.status(409).json({
          error: {
            code: "ADMIN_INACTIVE",
            message: "비활성 관리자는 먼저 다시 활성화해야 합니다."
          }
        });
        return;
      }

      const { token, expiresAt } = await createPasswordResetToken({
        adminId: target.id,
        requestedIp: request.ip
      });

      try {
        const resendId = await sendPasswordResetEmail({
          to: target.email,
          adminName: target.name,
          token
        });

        await database.insert(auditLogs).values({
          actorAdminId: actor.id,
          action: "ADMIN_RESET_EMAIL_SENT",
          entityType: "admin",
          entityId: target.id,
          metadata: { resendId },
          ipAddress: request.ip,
          userAgent: request.get("user-agent")
        });

        response.status(200).json({
          success: true,
          expiresAt: toKstIsoString(expiresAt)
        });
      } catch (emailError) {
        await invalidatePasswordResetToken(token);

        console.error("관리자 재설정 이메일 발송 실패:", emailError);

        await database.insert(auditLogs).values({
          actorAdminId: actor.id,
          action: "ADMIN_RESET_EMAIL_FAILED",
          entityType: "admin",
          entityId: target.id,
          metadata: { reason: "delivery_failed" },
          ipAddress: request.ip,
          userAgent: request.get("user-agent")
        });

        response.status(502).json({
          error: {
            code: "ADMIN_RESET_EMAIL_FAILED",
            message: "재설정 이메일을 발송하지 못했습니다."
          }
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

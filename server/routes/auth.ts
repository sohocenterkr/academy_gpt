import { createHash } from "node:crypto";
import { Router, type Request } from "express";
import { rateLimit } from "express-rate-limit";
import { and, eq, gt, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "../db";
import {
  clearSessionCookie,
  createAdminSession,
  getAuthenticatedAdmin,
  revokeCurrentSession,
  setSessionCookie
} from "../services/auth/session";
import {
  hashPassword,
  normalizeEmail,
  verifyPassword
} from "../services/auth/password";
import { toKstIsoString } from "../../shared/kst";
import {
  adminSessions,
  admins,
  auditLogs,
  passwordResetTokens
} from "../../shared/schema";
import {
  createPasswordResetToken,
  hashPasswordResetToken,
  invalidatePasswordResetToken
} from "../services/auth/password-reset";
import { sendPasswordResetEmail } from "../services/email/resend";
import {
  passwordResetConfirmSchema,
  passwordResetRequestSchema
} from "../../shared/validators/auth";

const router = Router();
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

const loginSchema = z.object({
  email: z.email("올바른 이메일을 입력해 주세요."),
  password: z
    .string()
    .min(1, "비밀번호를 입력해 주세요.")
    .max(128, "비밀번호가 너무 깁니다.")
});

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_request, response) => {
    response.status(429).json({
      error: {
        code: "TOO_MANY_LOGIN_REQUESTS",
        message: "로그인 요청이 너무 많습니다. 15분 후 다시 시도해 주세요."
      }
    });
  }
});

const passwordResetRequestRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_request, response) => {
    response.status(429).json({
      error: {
        code: "TOO_MANY_RESET_REQUESTS",
        message: "재설정 요청이 너무 많습니다. 15분 후 다시 시도해 주세요."
      }
    });
  }
});

const passwordResetConfirmRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false
});

function getRequestMetadata(request: Request) {
  return {
    ipAddress: request.ip || request.socket.remoteAddress,
    userAgent: request.get("user-agent")
  };
}

function hashEmailForAudit(email: string): string {
  return createHash("sha256").update(email).digest("hex").slice(0, 16);
}

function publicAdmin(admin: {
  id: string;
  email: string;
  name: string;
  role: "super_admin" | "admin";
  createdAt: Date;
  passwordChangedAt: Date;
}) {
  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
    createdAt: toKstIsoString(admin.createdAt),
    passwordChangedAt: toKstIsoString(admin.passwordChangedAt)
  };
}

router.post("/login", loginRateLimiter, async (request, response, next) => {
  try {
    const input = loginSchema.safeParse(request.body);

    if (!input.success) {
      response.status(400).json({
        error: {
          code: "INVALID_LOGIN_INPUT",
          message: input.error.issues[0]?.message ?? "입력값을 확인해 주세요."
        }
      });
      return;
    }

    const database = getDatabase();
    const email = normalizeEmail(input.data.email);
    const metadata = getRequestMetadata(request);
    const now = new Date();

    const [admin] = await database
      .select()
      .from(admins)
      .where(and(eq(admins.email, email), isNull(admins.deletedAt)))
      .limit(1);

    if (!admin) {
      await database.insert(auditLogs).values({
        action: "ADMIN_LOGIN_FAILED",
        entityType: "admin",
        metadata: {
          reason: "unknown_email",
          emailFingerprint: hashEmailForAudit(email)
        },
        ...metadata
      });

      response.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "이메일 또는 비밀번호를 확인해 주세요."
        }
      });
      return;
    }

    if (admin.status === "inactive") {
      await database.insert(auditLogs).values({
        actorAdminId: admin.id,
        action: "ADMIN_LOGIN_FAILED",
        entityType: "admin",
        entityId: admin.id,
        metadata: { reason: "inactive" },
        ...metadata
      });

      response.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "이메일 또는 비밀번호를 확인해 주세요."
        }
      });
      return;
    }

    if (
      admin.status === "locked" &&
      admin.lockedUntil &&
      admin.lockedUntil > now
    ) {
      await database.insert(auditLogs).values({
        actorAdminId: admin.id,
        action: "ADMIN_LOGIN_BLOCKED",
        entityType: "admin",
        entityId: admin.id,
        metadata: { reason: "temporary_lock" },
        ...metadata
      });

      response.status(423).json({
        error: {
          code: "ACCOUNT_TEMPORARILY_LOCKED",
          message: "로그인 실패가 누적되어 잠시 잠겼습니다. 15분 후 다시 시도해 주세요."
        }
      });
      return;
    }

    const passwordMatches = await verifyPassword(
      input.data.password,
      admin.passwordHash
    );

    if (!passwordMatches) {
      const failedAttempts = admin.failedLoginAttempts + 1;
      const shouldLock = failedAttempts >= MAX_FAILED_ATTEMPTS;
      const lockedUntil = shouldLock
        ? new Date(now.getTime() + LOCK_MINUTES * 60 * 1000)
        : null;

      await database.transaction(async (transaction) => {
        await transaction
          .update(admins)
          .set({
            failedLoginAttempts: failedAttempts,
            status: shouldLock ? "locked" : admin.status,
            lockedUntil,
            updatedAt: now
          })
          .where(eq(admins.id, admin.id));

        await transaction.insert(auditLogs).values({
          actorAdminId: admin.id,
          action: "ADMIN_LOGIN_FAILED",
          entityType: "admin",
          entityId: admin.id,
          metadata: {
            reason: "wrong_password",
            failedAttempts,
            locked: shouldLock
          },
          ...metadata
        });
      });

      response.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "이메일 또는 비밀번호를 확인해 주세요."
        }
      });
      return;
    }

    await database.transaction(async (transaction) => {
      await transaction
        .update(admins)
        .set({
          failedLoginAttempts: 0,
          status: "active",
          lockedUntil: null,
          lastLoginAt: now,
          updatedAt: now
        })
        .where(eq(admins.id, admin.id));

      await transaction.insert(auditLogs).values({
        actorAdminId: admin.id,
        action: "ADMIN_LOGIN_SUCCEEDED",
        entityType: "admin",
        entityId: admin.id,
        metadata: {},
        ...metadata
      });
    });

    const session = await createAdminSession({
      adminId: admin.id,
      ...metadata
    });

    setSessionCookie(response, session.token, session.expiresAt);

    response.status(200).json({
      admin: publicAdmin(admin),
      sessionExpiresAt: toKstIsoString(session.expiresAt)
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", async (request, response, next) => {
  try {
    const admin = await getAuthenticatedAdmin(request);

    if (!admin) {
      clearSessionCookie(response);
      response.status(401).json({
        error: {
          code: "NOT_AUTHENTICATED",
          message: "로그인이 필요합니다."
        }
      });
      return;
    }

    response.status(200).json({
      admin: publicAdmin(admin)
    });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", async (request, response, next) => {
  try {
    const admin = await getAuthenticatedAdmin(request);
    const metadata = getRequestMetadata(request);

    await revokeCurrentSession(request);
    clearSessionCookie(response);

    if (admin) {
      await getDatabase().insert(auditLogs).values({
        actorAdminId: admin.id,
        action: "ADMIN_LOGOUT",
        entityType: "admin",
        entityId: admin.id,
        metadata: {},
        ...metadata
      });
    }

    response.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});


router.post(
  "/forgot-password",
  passwordResetRequestRateLimiter,
  async (request, response, next) => {
    const startedAt = Date.now();

    try {
      const input = passwordResetRequestSchema.safeParse(request.body);

      if (!input.success) {
        response.status(400).json({
          error: {
            code: "INVALID_RESET_REQUEST",
            message:
              input.error.issues[0]?.message ?? "입력값을 확인해 주세요."
          }
        });
        return;
      }

      const database = getDatabase();
      const email = normalizeEmail(input.data.email);
      const requestMetadata = getRequestMetadata(request);

      const [admin] = await database
        .select({
          id: admins.id,
          email: admins.email,
          name: admins.name,
          status: admins.status
        })
        .from(admins)
        .where(
          and(
            eq(admins.email, email),
            isNull(admins.deletedAt),
            inArray(admins.status, ["active", "locked"])
          )
        )
        .limit(1);

      if (admin) {
        const reset = await createPasswordResetToken({
          adminId: admin.id,
          requestedIp: requestMetadata.ipAddress
        });

        try {
          const resendMessageId = await sendPasswordResetEmail({
            to: admin.email,
            adminName: admin.name,
            token: reset.token
          });

          await database.insert(auditLogs).values({
            actorAdminId: admin.id,
            action: "PASSWORD_RESET_EMAIL_SENT",
            entityType: "admin",
            entityId: admin.id,
            metadata: {
              resendMessageId,
              expiresAt: toKstIsoString(reset.expiresAt)
            },
            ...requestMetadata
          });
        } catch (emailError) {
          await invalidatePasswordResetToken(reset.token);

          await database.insert(auditLogs).values({
            actorAdminId: admin.id,
            action: "PASSWORD_RESET_EMAIL_FAILED",
            entityType: "admin",
            entityId: admin.id,
            metadata: {
              reason:
                emailError instanceof Error
                  ? emailError.message.slice(0, 300)
                  : "unknown_email_error"
            },
            ...requestMetadata
          });

          console.error(
            "비밀번호 재설정 이메일 발송 실패:",
            emailError instanceof Error ? emailError.message : "알 수 없는 오류"
          );
        }
      }

      const minimumResponseTime = 300;
      const remainingDelay = minimumResponseTime - (Date.now() - startedAt);

      if (remainingDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingDelay));
      }

      response.status(200).json({
        success: true,
        message:
          "등록된 관리자 이메일이면 비밀번호 재설정 안내를 발송했습니다."
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/reset-password",
  passwordResetConfirmRateLimiter,
  async (request, response, next) => {
    try {
      const input = passwordResetConfirmSchema.safeParse(request.body);

      if (!input.success) {
        response.status(400).json({
          error: {
            code: "INVALID_RESET_INPUT",
            message:
              input.error.issues[0]?.message ?? "입력값을 확인해 주세요."
          }
        });
        return;
      }

      const database = getDatabase();
      const tokenHash = hashPasswordResetToken(input.data.token);
      const passwordHash = await hashPassword(input.data.password);
      const now = new Date();
      const requestMetadata = getRequestMetadata(request);

      const passwordChanged = await database.transaction(
        async (transaction) => {
          const [resetRecord] = await transaction
            .select({
              tokenId: passwordResetTokens.id,
              adminId: admins.id
            })
            .from(passwordResetTokens)
            .innerJoin(
              admins,
              eq(passwordResetTokens.adminId, admins.id)
            )
            .where(
              and(
                eq(passwordResetTokens.tokenHash, tokenHash),
                isNull(passwordResetTokens.usedAt),
                gt(passwordResetTokens.expiresAt, now),
                isNull(admins.deletedAt),
                inArray(admins.status, ["active", "locked"])
              )
            )
            .for("update")
            .limit(1);

          if (!resetRecord) {
            return false;
          }

          await transaction
            .update(passwordResetTokens)
            .set({ usedAt: now })
            .where(eq(passwordResetTokens.id, resetRecord.tokenId));

          await transaction
            .update(admins)
            .set({
              passwordHash,
              passwordChangedAt: now,
              failedLoginAttempts: 0,
              lockedUntil: null,
              status: "active",
              updatedAt: now
            })
            .where(eq(admins.id, resetRecord.adminId));

          await transaction
            .update(adminSessions)
            .set({ revokedAt: now })
            .where(
              and(
                eq(adminSessions.adminId, resetRecord.adminId),
                isNull(adminSessions.revokedAt)
              )
            );

          await transaction.insert(auditLogs).values({
            actorAdminId: resetRecord.adminId,
            action: "PASSWORD_RESET_SUCCEEDED",
            entityType: "admin",
            entityId: resetRecord.adminId,
            metadata: {
              allSessionsRevoked: true
            },
            ...requestMetadata
          });

          return true;
        }
      );

      if (!passwordChanged) {
        response.status(400).json({
          error: {
            code: "INVALID_OR_EXPIRED_RESET_TOKEN",
            message:
              "재설정 링크가 만료되었거나 이미 사용되었습니다. 다시 요청해 주세요."
          }
        });
        return;
      }

      clearSessionCookie(response);

      response.status(200).json({
        success: true,
        message: "비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요."
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as authRouter };

import { createHash } from "node:crypto";
import { Router, type Request } from "express";
import { rateLimit } from "express-rate-limit";
import { and, eq, isNull } from "drizzle-orm";
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
  normalizeEmail,
  verifyPassword
} from "../services/auth/password";
import { toKstIsoString } from "../../shared/kst";
import { admins, auditLogs } from "../../shared/schema";

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

export { router as authRouter };

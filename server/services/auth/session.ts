import { createHmac, randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { getAuthEnv } from "../../config/env";
import { getDatabase } from "../../db";
import { adminSessions, admins } from "../../../shared/schema";

export const SESSION_COOKIE_NAME = "academy_admin_session";
const DEFAULT_SESSION_HOURS = 12;
const LAST_SEEN_UPDATE_MINUTES = 5;

export type AuthenticatedAdmin = {
  id: string;
  email: string;
  name: string;
  role: "super_admin" | "admin";
  sessionId: string;
  createdAt: Date;
  passwordChangedAt: Date;
};

function getSessionHours(): number {
  const parsed = Number.parseInt(
    process.env.AUTH_SESSION_TTL_HOURS ?? String(DEFAULT_SESSION_HOURS),
    10
  );

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 168) {
    return DEFAULT_SESSION_HOURS;
  }

  return parsed;
}

function hashSessionToken(token: string): string {
  const { AUTH_SESSION_SECRET } = getAuthEnv();

  return createHmac("sha256", AUTH_SESSION_SECRET)
    .update(token)
    .digest("hex");
}

function readSessionToken(request: Request): string | undefined {
  const value = request.cookies?.[SESSION_COOKIE_NAME];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export async function createAdminSession(input: {
  adminId: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ token: string; expiresAt: Date }> {
  const database = getDatabase();
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(
    Date.now() + getSessionHours() * 60 * 60 * 1000
  );

  await database.insert(adminSessions).values({
    adminId: input.adminId,
    tokenHash,
    expiresAt,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent
  });

  return { token, expiresAt };
}

export function setSessionCookie(
  response: Response,
  token: string,
  expiresAt: Date
): void {
  response.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt
  });
}

export function clearSessionCookie(response: Response): void {
  response.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });
}

export async function getAuthenticatedAdmin(
  request: Request
): Promise<AuthenticatedAdmin | null> {
  const token = readSessionToken(request);

  if (!token) {
    return null;
  }

  const database = getDatabase();
  const tokenHash = hashSessionToken(token);
  const now = new Date();

  const [record] = await database
    .select({
      sessionId: adminSessions.id,
      lastSeenAt: adminSessions.lastSeenAt,
      adminId: admins.id,
      email: admins.email,
      name: admins.name,
      role: admins.role,
      createdAt: admins.createdAt,
      passwordChangedAt: admins.passwordChangedAt
    })
    .from(adminSessions)
    .innerJoin(admins, eq(adminSessions.adminId, admins.id))
    .where(
      and(
        eq(adminSessions.tokenHash, tokenHash),
        isNull(adminSessions.revokedAt),
        gt(adminSessions.expiresAt, now),
        eq(admins.status, "active"),
        isNull(admins.deletedAt)
      )
    )
    .limit(1);

  if (!record) {
    return null;
  }

  const updateBefore = new Date(
    now.getTime() - LAST_SEEN_UPDATE_MINUTES * 60 * 1000
  );

  if (record.lastSeenAt < updateBefore) {
    await database
      .update(adminSessions)
      .set({ lastSeenAt: now })
      .where(eq(adminSessions.id, record.sessionId));
  }

  return {
    id: record.adminId,
    email: record.email,
    name: record.name,
    role: record.role,
    sessionId: record.sessionId,
    createdAt: record.createdAt,
    passwordChangedAt: record.passwordChangedAt
  };
}

export async function revokeCurrentSession(request: Request): Promise<void> {
  const token = readSessionToken(request);

  if (!token) {
    return;
  }

  const database = getDatabase();
  const tokenHash = hashSessionToken(token);

  await database
    .update(adminSessions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(adminSessions.tokenHash, tokenHash),
        isNull(adminSessions.revokedAt)
      )
    );
}

export async function deleteExpiredSessions(): Promise<number> {
  const database = getDatabase();
  const removed = await database
    .delete(adminSessions)
    .where(lt(adminSessions.expiresAt, new Date()))
    .returning({ id: adminSessions.id });

  return removed.length;
}

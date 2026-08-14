import { createHmac, randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { getAuthEnv } from "../../config/env";
import { getDatabase } from "../../db";
import { passwordResetTokens } from "../../../shared/schema";

export const PASSWORD_RESET_MINUTES = 30;

export function hashPasswordResetToken(token: string): string {
  const { AUTH_SESSION_SECRET } = getAuthEnv();

  return createHmac("sha256", AUTH_SESSION_SECRET)
    .update(`password-reset:${token}`)
    .digest("hex");
}

export async function createPasswordResetToken(input: {
  adminId: string;
  requestedIp?: string;
}): Promise<{ token: string; expiresAt: Date }> {
  const database = getDatabase();
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashPasswordResetToken(token);
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + PASSWORD_RESET_MINUTES * 60 * 1000
  );

  await database.transaction(async (transaction) => {
    await transaction
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(passwordResetTokens.adminId, input.adminId),
          isNull(passwordResetTokens.usedAt)
        )
      );

    await transaction.insert(passwordResetTokens).values({
      adminId: input.adminId,
      tokenHash,
      expiresAt,
      requestedIp: input.requestedIp
    });
  });

  return { token, expiresAt };
}

export async function invalidatePasswordResetToken(
  token: string
): Promise<void> {
  const database = getDatabase();

  await database
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(passwordResetTokens.tokenHash, hashPasswordResetToken(token)),
        isNull(passwordResetTokens.usedAt)
      )
    );
}

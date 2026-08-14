import { sql } from "drizzle-orm";
import { getInitialAdminEnv } from "../server/config/env";
import { closeDatabase, getDatabase } from "../server/db";
import { hashPassword, normalizeEmail } from "../server/services/auth/password";
import { admins, auditLogs } from "../shared/schema";

async function bootstrapInitialAdmin(): Promise<void> {
  const env = getInitialAdminEnv();
  const database = getDatabase();
  const email = normalizeEmail(env.INITIAL_ADMIN_EMAIL);
  let created = false;

  await database.transaction(async (transaction) => {
    await transaction.execute(
      sql`SELECT pg_advisory_xact_lock(20420814)`
    );

    const existingAdmins = await transaction
      .select({ id: admins.id })
      .from(admins)
      .limit(1);

    if (existingAdmins.length > 0) {
      return;
    }

    const passwordHash = await hashPassword(env.INITIAL_ADMIN_PASSWORD);

    const [createdAdmin] = await transaction
      .insert(admins)
      .values({
        email,
        name: env.INITIAL_ADMIN_NAME.trim(),
        passwordHash,
        role: "super_admin",
        status: "active"
      })
      .returning({ id: admins.id });

    if (!createdAdmin) {
      throw new Error("최고관리자 생성 결과를 확인할 수 없습니다.");
    }

    await transaction.insert(auditLogs).values({
      actorAdminId: createdAdmin.id,
      action: "ADMIN_BOOTSTRAPPED",
      entityType: "admin",
      entityId: createdAdmin.id,
      metadata: {
        source: "initial_secrets"
      }
    });

    created = true;
  });

  if (created) {
    console.log("SUCCESS: Replit 개발 DB에 최고관리자 1명을 생성했습니다.");
  } else {
    console.log("NO_CHANGE: 관리자가 이미 있어 새 계정을 만들지 않았습니다.");
  }
}

try {
  await bootstrapInitialAdmin();
} catch (error) {
  console.error(
    "최고관리자 생성 실패:",
    error instanceof Error ? error.message : "알 수 없는 오류"
  );
  process.exitCode = 1;
} finally {
  await closeDatabase();
}

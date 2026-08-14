import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema";
import { getDatabaseEnv } from "./config/env";

let poolInstance: pg.Pool | undefined;
let databaseInstance: NodePgDatabase<typeof schema> | undefined;

export function getPool(): pg.Pool {
  if (!poolInstance) {
    const { DATABASE_URL } = getDatabaseEnv();

    poolInstance = new pg.Pool({
      connectionString: DATABASE_URL,
      max: process.env.VERCEL ? 1 : 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      allowExitOnIdle: true
    });
  }

  return poolInstance;
}

export function getDatabase(): NodePgDatabase<typeof schema> {
  if (!databaseInstance) {
    databaseInstance = drizzle(getPool(), { schema });
  }

  return databaseInstance;
}

export async function closeDatabase(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = undefined;
    databaseInstance = undefined;
  }
}

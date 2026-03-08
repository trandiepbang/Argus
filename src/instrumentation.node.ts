import { sql } from "drizzle-orm";
import { db } from "@/infrastructure/database/drizzle/client";
import { redis } from "@/infrastructure/redis/client";

export async function checkDatabaseConnection() {
  try {
    await db.execute(sql`SELECT 1`);
    console.log("[startup] Database connection OK");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[startup] Database connection FAILED: ${msg}`);
    process.exit(1);
  }
}

export async function checkRedisConnection() {
  try {
    await redis.connect();
    await redis.ping();
    console.log("[startup] Redis connection OK");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[startup] Redis connection FAILED: ${msg}`);
    process.exit(1);
  }
}

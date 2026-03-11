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
    await redis.ping();
    console.log("[startup] Redis connection OK");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[startup] Redis connection FAILED: ${msg}`);
    process.exit(1);
  }
}

export function displayTrustedSources() {
  const raw = process.env.TRUSTED_SOURCES ?? "";
  const sources = raw.split(",").map((s) => s.trim()).filter(Boolean);
  
  if (sources.length === 0) {
    console.warn("[startup] No trusted sources configured");
    return;
  }
  
  console.log(`[startup] Loaded ${sources.length} trusted source(s):`);
  sources.forEach((source, index) => {
    console.log(`  ${index + 1}. ${source}`);
  });
}

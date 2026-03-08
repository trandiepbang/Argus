import type { Redis } from "ioredis";
import { IRateLimitRepository } from "@/domain/repositories";

const WINDOW_SECONDS = 3600; // 1 hour

function windowKey(userId: string): string {
  const now = new Date();
  // Bucket by hour: "2026-03-07T14" — resets every clock hour
  const hour = now.toISOString().slice(0, 13);
  return `rate_limit:${userId}:${hour}`;
}

export class RedisRateLimitRepository implements IRateLimitRepository {
  constructor(private readonly redis: Redis) {}

  async increment(userId: string): Promise<number> {
    const key = windowKey(userId);
    const count = await this.redis.incr(key);
    if (count === 1) {
      // First request in this window — set TTL
      await this.redis.expire(key, WINDOW_SECONDS);
    }
    return count;
  }
}

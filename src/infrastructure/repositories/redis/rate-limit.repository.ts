import type { Redis } from "ioredis";
import { IRateLimitRepository } from "@/domain/repositories";

function windowKey(userId: string, windowSeconds: number): string {
  // Bucket the current time into fixed windows of windowSeconds size
  const bucket = Math.floor(Date.now() / 1000 / windowSeconds);
  return `rate_limit:${userId}:${windowSeconds}s:${bucket}`;
}

export class RedisRateLimitRepository implements IRateLimitRepository {
  constructor(private readonly redis: Redis) {}

  async increment(userId: string, windowSeconds: number): Promise<number> {
    const key = windowKey(userId, windowSeconds);
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, windowSeconds);
    }
    return count;
  }
}

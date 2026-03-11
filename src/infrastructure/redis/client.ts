import Redis from "ioredis";

export const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: 1,
  enableOfflineQueue: true,  // queue commands issued before initial connect completes
});

// Log Redis errors without crashing — prevents unhandled error events
redis.on("error", (err: Error) => {
  console.error("[redis] Error:", err.message);
});

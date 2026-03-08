/**
 * Contract for per-user API rate limiting.
 * windowSeconds determines the bucket size (e.g. 1 for burst, 3600 for hourly).
 */
export interface IRateLimitRepository {
  increment(userId: string, windowSeconds: number): Promise<number>;
}

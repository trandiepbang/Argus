/**
 * Contract for per-user API rate limiting.
 * Current window is determined by the implementation (e.g. current hour).
 */
export interface IRateLimitRepository {
  increment(userId: string): Promise<number>;
}

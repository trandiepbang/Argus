import { db } from "@/infrastructure/database/drizzle/client";
import { redis } from "@/infrastructure/redis/client";
import { PerplexityVerificationService } from "@/infrastructure/services/perplexity.service";
import { PostgresVerificationResultRepository } from "@/infrastructure/database/repositories/postgres/verification-result.repository";
import { RedisRateLimitRepository } from "@/infrastructure/repositories/redis/rate-limit.repository";
import { IVerificationService, IVerificationResultRepository, IRateLimitRepository } from "@/domain/repositories";

export const container = {
  get verificationService(): IVerificationService {
    return new PerplexityVerificationService();
  },

  get verificationResultRepository(): IVerificationResultRepository {
    return new PostgresVerificationResultRepository(db);
  },

  get rateLimitRepository(): IRateLimitRepository {
    return new RedisRateLimitRepository(redis);
  },
};

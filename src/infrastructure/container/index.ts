import { db } from "@/infrastructure/database/drizzle/client";
import { PerplexityVerificationService } from "@/infrastructure/services/perplexity.service";
import { PostgresVerificationResultRepository } from "@/infrastructure/database/repositories/postgres/verification-result.repository";
import { IVerificationService, IVerificationResultRepository } from "@/domain/repositories";

export const container = {
  get verificationService(): IVerificationService {
    return new PerplexityVerificationService();
  },

  get verificationResultRepository(): IVerificationResultRepository {
    return new PostgresVerificationResultRepository(db);
  },
};

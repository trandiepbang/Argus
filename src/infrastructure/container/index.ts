import { db } from "@/infrastructure/database/drizzle/client";
import { GeminiVerificationService } from "@/infrastructure/services/gemini.service";
import { PostgresVerificationResultRepository } from "@/infrastructure/database/repositories/postgres/verification-result.repository";
import { IVerificationService, IVerificationResultRepository } from "@/domain/repositories";

export const container = {
  get verificationService(): IVerificationService {
    return new GeminiVerificationService();
  },

  get verificationResultRepository(): IVerificationResultRepository {
    return new PostgresVerificationResultRepository(db);
  },
};

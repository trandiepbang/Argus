import { VerifyResult } from "@/domain/entities/verify.entity";

/**
 * Contract for any AI-powered claim verification provider.
 * Swap the underlying model (Gemini, OpenAI, Claude, …) by providing
 * a different implementation and updating the container — nothing else changes.
 */
export interface IVerificationService {
  verifyClaim(claim: string): Promise<VerifyResult>;
}

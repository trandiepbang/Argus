import { VerifyClaimInput, VerifyApiResponse } from "@/domain/entities/verify.entity";
import { IVerificationService, IVerificationResultRepository } from "@/domain/repositories";

export class VerifyClaimUseCase {
  constructor(
    private readonly verificationService: IVerificationService,
    private readonly verificationResultRepository: IVerificationResultRepository,
  ) {}

  async execute(input: VerifyClaimInput): Promise<VerifyApiResponse> {
    if (!input.claim || input.claim.trim().length === 0) {
      throw new Error("claim is required and must not be empty");
    }

    const trimmedInput: VerifyClaimInput = { claim: input.claim.trim() };

    const result = await this.verificationService.verifyClaim(trimmedInput.claim);

    await this.verificationResultRepository.save(trimmedInput, result);

    return {
      success: true,
      data: {
        status: result.verdict.status,
        explanation: result.verdict.explanation,
        source_quote: result.verdict.source_quote,
        sources: result.sources,
      },
    };
  }
}

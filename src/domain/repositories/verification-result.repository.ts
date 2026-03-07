import { VerificationRecord, VerifyResult, VerifyClaimInput } from "@/domain/entities/verify.entity";

export interface IVerificationResultRepository {
  save(input: VerifyClaimInput, result: VerifyResult): Promise<VerificationRecord>;
  findAll(): Promise<VerificationRecord[]>;
  findById(id: string): Promise<VerificationRecord | null>;
}

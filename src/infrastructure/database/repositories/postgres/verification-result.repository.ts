import { eq } from "drizzle-orm";
import { VerificationRecord, VerifyClaimInput, VerifyResult } from "@/domain/entities/verify.entity";
import { IVerificationResultRepository } from "@/domain/repositories";
import { Database } from "@/infrastructure/database/drizzle/client";
import { verificationResults, VerificationResultRecord } from "@/infrastructure/database/drizzle/schema";

function toEntity(r: VerificationResultRecord): VerificationRecord {
  return {
    id: r.id,
    claim: r.claim,
    status: r.status,
    explanation: r.explanation,
    source_quote: r.sourceQuote,
    sources: r.sources as string[],
    engine: r.engine,
    createdAt: r.createdAt,
  };
}

export class PostgresVerificationResultRepository implements IVerificationResultRepository {
  constructor(private readonly db: Database) {}

  async save(input: VerifyClaimInput, result: VerifyResult): Promise<VerificationRecord> {
    const [record] = await this.db
      .insert(verificationResults)
      .values({
        claim: input.claim,
        status: result.verdict.status,
        explanation: result.verdict.explanation ?? "",
        sourceQuote: result.verdict.source_quote ?? "",
        sources: result.sources,
        engine: result.engine,
      })
      .returning();
    return toEntity(record);
  }

  async findAll(): Promise<VerificationRecord[]> {
    const records = await this.db.select().from(verificationResults);
    return records.map(toEntity);
  }

  async findById(id: string): Promise<VerificationRecord | null> {
    const [record] = await this.db
      .select()
      .from(verificationResults)
      .where(eq(verificationResults.id, id))
      .limit(1);
    return record ? toEntity(record) : null;
  }
}

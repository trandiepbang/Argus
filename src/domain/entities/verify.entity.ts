export interface VerifyClaimInput {
  claim: string;
}

export type VerifyStatus = "TRUE" | "FALSE";

/** Which engine produced the final verification result */
export type VerifyEngine = "perplexity" | "gemini" | "conflict" | "filtered" | "unverifiable";

/** Provider-agnostic verdict — no AI provider names here */
export interface VerifyVerdict {
  status: VerifyStatus;
  explanation: string;
  source_quote: string;
}

/** Provider-agnostic result returned by any IVerificationService implementation */
export interface VerifyResult {
  verdict: VerifyVerdict;
  sources: string[];
  engine: VerifyEngine;
}

/** A persisted verification record (as stored in the DB) */
export interface VerificationRecord {
  id: string;
  claim: string;
  status: VerifyStatus;
  explanation: string;
  source_quote: string;
  sources: string[];
  engine: VerifyEngine;
  createdAt: Date;
}

/** Final response sent to the client */
export interface VerifyApiResponse {
  success: true;
  data: VerifyVerdict & {
    sources: string[];
    engine: VerifyEngine;
  };
}

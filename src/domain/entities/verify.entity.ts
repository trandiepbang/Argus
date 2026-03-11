export interface VerifyClaimInput {
  claim: string;
}

export type VerifyStatus = "TRUE" | "FALSE";

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
}

/** A persisted verification record (as stored in the DB) */
export interface VerificationRecord {
  id: string;
  claim: string;
  status: VerifyStatus;
  explanation: string;
  source_quote: string;
  sources: string[];
  createdAt: Date;
}

/** Final response sent to the client */
export interface VerifyApiResponse {
  success: true;
  data: VerifyVerdict & {
    sources: string[];
  };
}

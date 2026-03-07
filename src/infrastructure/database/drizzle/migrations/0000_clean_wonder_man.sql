CREATE TYPE "verify_status" AS ENUM ('TRUE', 'FALSE', 'UNVERIFIED', 'EVIDENCE_NOT_FOUND');

CREATE TABLE "verification_results" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "claim" text NOT NULL,
  "status" "verify_status" NOT NULL,
  "explanation" text NOT NULL,
  "source_quote" text NOT NULL,
  "sources" json DEFAULT '[]' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

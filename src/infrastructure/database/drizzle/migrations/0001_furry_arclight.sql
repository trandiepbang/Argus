CREATE TYPE "public"."verify_engine" AS ENUM('perplexity', 'gemini', 'conflict', 'filtered');--> statement-breakpoint
ALTER TABLE "verification_results" ADD COLUMN "engine" "verify_engine" DEFAULT 'perplexity' NOT NULL;

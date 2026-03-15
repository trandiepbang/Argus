import { json, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const verifyStatusEnum = pgEnum("verify_status", [
  "TRUE",
  "FALSE",
]);

export const verifyEngineEnum = pgEnum("verify_engine", [
  "perplexity",
  "gemini",
  "conflict",
  "filtered",
  "unverifiable",
]);

export const verificationResults = pgTable("verification_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  claim: text("claim").notNull(),
  status: verifyStatusEnum("status").notNull(),
  explanation: text("explanation").notNull(),
  sourceQuote: text("source_quote").notNull(),
  sources: json("sources").$type<string[]>().notNull().default([]),
  engine: verifyEngineEnum("engine").notNull().default("perplexity"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type VerificationResultRecord = typeof verificationResults.$inferSelect;
export type NewVerificationResultRecord = typeof verificationResults.$inferInsert;

import { json, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const verifyStatusEnum = pgEnum("verify_status", [
  "TRUE",
  "FALSE",
  "UNVERIFIED",
  "EVIDENCE_NOT_FOUND",
]);

export const verificationResults = pgTable("verification_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  claim: text("claim").notNull(),
  status: verifyStatusEnum("status").notNull(),
  explanation: text("explanation").notNull(),
  sourceQuote: text("source_quote").notNull(),
  sources: json("sources").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type VerificationResultRecord = typeof verificationResults.$inferSelect;
export type NewVerificationResultRecord = typeof verificationResults.$inferInsert;

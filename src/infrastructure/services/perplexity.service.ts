import { VerifyResult, VerifyVerdict } from "@/domain/entities/verify.entity";
import { IVerificationService } from "@/domain/repositories";

const LOG_PREFIX = `{app = "ssacb-chartbuilderapi"} |= "Client error from chartBuilderWeb"`;

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";

// sonar models have live web search built-in — no extra tool config needed
const MODEL = "sonar";

const SYSTEM_PROMPT = `You are a strict, objective fact-checking API. Verify the user's claim against live search results, prioritizing the trusted source vnexpress.net.
RULES:
1. STRICT GROUNDING: Use ONLY retrieved information.
2. NO OUTSIDE KNOWLEDGE.
3. "NOT FOUND" RULE: If search lacks info to prove/disprove, output exactly "EVIDENCE_NOT_FOUND".
4. QUOTE REQUIREMENT: Provide the verbatim source quote justifying your decision.

Respond ONLY with a JSON object in this exact shape (no markdown, no extra text):
{
  "status": "TRUE" | "FALSE" | "UNVERIFIED" | "EVIDENCE_NOT_FOUND",
  "explanation": "<concise explanation>",
  "source_quote": "<verbatim quote from source, or empty string if EVIDENCE_NOT_FOUND>"
}`;

interface PerplexityApiResponse {
  choices?: Array<{
    message?: { content?: string };
  }>;
  citations?: string[];
}

export class PerplexityVerificationService implements IVerificationService {
  async verifyClaim(claim: string): Promise<VerifyResult> {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      const msg = "PERPLEXITY_API_KEY is not configured";
      console.error(`${LOG_PREFIX} | ${msg}`);
      throw new Error(msg);
    }

    let raw: PerplexityApiResponse;

    try {
      const response = await fetch(PERPLEXITY_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: claim },
          ],
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        const msg = `Perplexity API error ${response.status}: ${body}`;
        console.error(`${LOG_PREFIX} | ${msg}`);
        throw new Error(msg);
      }

      raw = (await response.json()) as PerplexityApiResponse;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${LOG_PREFIX} | Perplexity fetch failed: ${msg}`);
      throw err;
    }

    const text = raw.choices?.[0]?.message?.content ?? "";
    if (!text) {
      const msg = "Perplexity returned an empty response";
      console.error(`${LOG_PREFIX} | ${msg}`);
      throw new Error(msg);
    }

    let verdict: VerifyVerdict;
    try {
      const jsonStr = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      verdict = JSON.parse(jsonStr) as VerifyVerdict;
    } catch {
      const msg = `Failed to parse Perplexity JSON output: ${text}`;
      console.error(`${LOG_PREFIX} | ${msg}`);
      throw new Error(msg);
    }

    // Perplexity returns citations as a top-level string array
    const sources: string[] = (raw.citations ?? []).filter((u) => typeof u === "string");

    return { verdict, sources };
  }
}

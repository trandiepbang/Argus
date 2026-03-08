import { VerifyResult, VerifyVerdict } from "@/domain/entities/verify.entity";
import { IVerificationService } from "@/domain/repositories";

const LOG_PREFIX = `{app = "ssacb-chartbuilderapi"} |= "Client error from chartBuilderWeb"`;

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";

// sonar models have live web search built-in — no extra tool config needed
const getModel = () => process.env.PERPLEXITY_MODEL ?? "sonar";

function getTrustedSources(): string[] {
  const raw = process.env.TRUSTED_SOURCES ?? "vnexpress.net";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function buildSystemPrompt(sources: string[]): string {
  const sourceList = sources.map((s) => `- ${s}`).join("\n");
  return `You are a strict, objective fact-checking API. Verify the user's claim using ONLY the following trusted news sources:
${sourceList}

RULES:
1. STRICT GROUNDING: Search and use ONLY information from the listed sources above.
2. NO OUTSIDE KNOWLEDGE. Do not use any knowledge beyond what is retrieved from these sources.
3. "NOT FOUND" RULE: If the listed sources lack sufficient information to prove or disprove the claim, output status "EVIDENCE_NOT_FOUND".
4. QUOTE REQUIREMENT: Provide the verbatim quote from the source that justifies your decision.

LANGUAGE: Write the "explanation" field in Vietnamese.

Respond ONLY with a JSON object in this exact shape (no markdown, no extra text):
{
  "status": "TRUE" | "FALSE" | "UNVERIFIED" | "EVIDENCE_NOT_FOUND",
  "explanation": "<giải thích ngắn gọn bằng tiếng Việt, trích dẫn nguồn>",
  "source_quote": "<verbatim quote from source, or empty string if EVIDENCE_NOT_FOUND>"
}`;
}

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
          model: getModel(),
          messages: [
            { role: "system", content: buildSystemPrompt(getTrustedSources()) },
            { role: "user", content: claim },
          ],
          search_domain_filter: getTrustedSources(),
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

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
  const domainList = sources.join(", ");
  return `You are a strict, objective fact-checking API.

STEP 1 — SEARCH: Before answering, actively search the web for the most recent articles and content from these trusted sources:
${sourceList}
Search using queries that include the site names (e.g. "site:${sources[0]} <claim keywords>"). Prioritise results published within the last 24 hours.

STEP 2 — VERIFY: Evaluate the claim against what you retrieved from those sources only.

RULES:
1. STRICT GROUNDING: Accept evidence ONLY from the listed sources (${domainList}). Ignore all other domains.
2. NO OUTSIDE KNOWLEDGE. Do not use any knowledge beyond what is retrieved from these sources in Step 1.
3. BINARY VERDICT: Output "TRUE" only if the claim is directly supported by a retrieved article from these sources. Output "FALSE" in ALL other cases — including when evidence is missing, insufficient, contradicts the claim, or the article could not be found.
4. QUOTE REQUIREMENT: Provide the verbatim quote from the source that justifies your decision. If no supporting quote exists, leave source_quote as an empty string.

LANGUAGE: Write the "explanation" field in Vietnamese.

Respond ONLY with a JSON object in this exact shape (no markdown, no extra text):
{
  "status": "TRUE" | "FALSE",
  "explanation": "<giải thích ngắn gọn bằng tiếng Việt, trích dẫn nguồn>",
  "source_quote": "<verbatim quote from source, or empty string>"
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
          search_recency_filter: "hour",
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
      const parsed = JSON.parse(jsonStr) as VerifyVerdict;
      // Normalise legacy/unexpected statuses to FALSE
      if (parsed.status !== "TRUE") parsed.status = "FALSE";
      verdict = parsed;
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

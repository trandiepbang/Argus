import { VerifyResult, VerifyVerdict } from "@/domain/entities/verify.entity";
import { IVerificationService } from "@/domain/repositories";

const LOG_PREFIX = `{app = "ssacb-chartbuilderapi"} |= "Client error from chartBuilderWeb"`;

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const SYSTEM_PROMPT = `You are a strict, objective fact-checking API. Verify the user's claim against live search results, prioritizing the trusted source vnexpress.net.
RULES:
1. STRICT GROUNDING: Use ONLY retrieved information.
2. NO OUTSIDE KNOWLEDGE.
3. "NOT FOUND" RULE: If search lacks info to prove/disprove, output exactly "EVIDENCE_NOT_FOUND".
4. QUOTE REQUIREMENT: Provide the verbatim source quote justifying your decision.

Respond ONLY with a JSON object in this exact shape:
{
  "status": "TRUE" | "FALSE" | "UNVERIFIED" | "EVIDENCE_NOT_FOUND",
  "explanation": "<concise explanation>",
  "source_quote": "<verbatim quote from source, or empty string if EVIDENCE_NOT_FOUND>"
}`;

interface GeminiApiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    groundingMetadata?: {
      groundingChunks?: Array<{
        web?: { uri?: string };
      }>;
    };
  }>;
}

export class GeminiVerificationService implements IVerificationService {
  async verifyClaim(claim: string): Promise<VerifyResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const msg = "GEMINI_API_KEY is not configured";
      console.error(`${LOG_PREFIX} | ${msg}`);
      throw new Error(msg);
    }

    let raw: GeminiApiResponse;

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: claim }] }],
          tools: [{ google_search: {} }],
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        const msg = `Gemini API error ${response.status}: ${body}`;
        console.error(`${LOG_PREFIX} | ${msg}`);
        throw new Error(msg);
      }

      raw = (await response.json()) as GeminiApiResponse;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${LOG_PREFIX} | Gemini fetch failed: ${msg}`);
      throw err;
    }

    const text = raw.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!text) {
      const msg = "Gemini returned an empty response";
      console.error(`${LOG_PREFIX} | ${msg}`);
      throw new Error(msg);
    }

    let verdict: VerifyVerdict;
    try {
      const jsonStr = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      verdict = JSON.parse(jsonStr) as VerifyVerdict;
    } catch {
      const msg = `Failed to parse Gemini JSON output: ${text}`;
      console.error(`${LOG_PREFIX} | ${msg}`);
      throw new Error(msg);
    }

    const sources: string[] = (raw.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [])
      .map((chunk) => chunk.web?.uri)
      .filter((uri): uri is string => typeof uri === "string" && uri.length > 0);

    return { verdict, sources };
  }
}

import { VerifyResult } from "@/domain/entities/verify.entity";
import { IVerificationService } from "@/domain/repositories";

// Cost breakdown per claim:
// Perplexity call 1 (search):  ~$0.006
// Perplexity call 2 (confirm): ~$0.006
// ─────────────────────────────────────────
// Total per claim:             ~$0.012

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";

// --- Internal types ---

type EngineStatus = "TRUE" | "FALSE" | "UNVERIFIABLE";
type Confidence = "HIGH" | "MEDIUM" | "LOW";

interface EngineVerdict {
  status: EngineStatus;
  explanation: string;
  source_quote: string;
  confidence: Confidence;
}

interface EngineResult {
  verdict: EngineVerdict;
  sources: string[];
}

// --- Shared helpers ---

function getTrustedSources(): string[] {
  const raw = process.env.TRUSTED_SOURCES ?? "vnexpress.net";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function stripJsonFences(text: string): string {
  return text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
}

function extractJsonObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return text;
  return text.slice(start, end + 1);
}

const VERDICT_SHAPE = `{
  "status": "TRUE" | "FALSE" | "UNVERIFIABLE",
  "explanation": "<in Vietnamese>",
  "source_quote": "<verbatim quote or empty string>",
  "confidence": "HIGH" | "MEDIUM" | "LOW"
}`;

// --- Perplexity ---

function buildPerplexityPrompt(sources: string[]): string {
  const sourceList = sources.map((s) => `- ${s}`).join("\n");
  const domainList = sources.join(", ");
  return `You are a strict, objective fact-checking API.

STEP 1 — SEARCH: Search the web for the most recent articles related to this claim. You MUST ONLY retrieve and cite articles from these exact domains:
${sourceList}

When searching, use queries that explicitly target these domains.
IGNORE and DISCARD any search result that does not come from the domains listed above, even if it seems relevant.

STEP 2 — VERIFY: Evaluate the claim ONLY against articles retrieved from the listed domains.

RULES:
1. DOMAIN ENFORCEMENT: If the retrieved article URL does not belong to one of these domains (${domainList}), treat it as if it does not exist. Do not use it as evidence under any circumstance.
2. NO OUTSIDE KNOWLEDGE: Do not use any knowledge beyond what is retrieved from the listed domains in Step 1.
3. VERDICT:
   - "TRUE": claim is directly supported by a retrieved article from the listed domains
   - "FALSE": a retrieved article from the listed domains directly contradicts the claim
   - "UNVERIFIABLE": no relevant article found from the listed domains, or retrieved articles are from unlisted domains
4. QUOTE REQUIREMENT: Verbatim quote from the source article that justifies your decision. Empty string if none found.
5. SOURCE VALIDATION: Before finalising your verdict, check the URL of every article you are citing. If the URL domain does not exactly match one of: ${domainList} — change your verdict to UNVERIFIABLE.

LANGUAGE: Write the explanation field in Vietnamese.

Respond ONLY with valid JSON (no markdown, no extra text):
${VERDICT_SHAPE}`;
}

async function runPerplexity(claim: string, sources: string[], label: string): Promise<EngineResult | null> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    console.warn(`PERPLEXITY_API_KEY is not configured`);
    return null;
  }

  const model = process.env.PERPLEXITY_MODEL ?? "sonar";
  console.info(`Perplexity ${label} | model=${model}`);
  let raw: { choices?: Array<{ message?: { content?: string } }>; citations?: string[] };

  try {
    const response = await fetch(PERPLEXITY_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: buildPerplexityPrompt(sources) },
          { role: "user", content: claim },
        ],
        search_context_size: "high"  // ← more content per article
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`Perplexity ${label} API error ${response.status}: ${body}`);
      return null;
    }

    raw = (await response.json()) as typeof raw;
  } catch (err) {
    console.error(`Perplexity ${label} fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }

  const text = raw.choices?.[0]?.message?.content ?? "";
  if (!text) {
    console.error(`Perplexity ${label} returned an empty response`);
    return null;
  }

  try {
    const parsed = JSON.parse(extractJsonObject(stripJsonFences(text))) as EngineVerdict;
    if (!["TRUE", "FALSE", "UNVERIFIABLE"].includes(parsed.status)) parsed.status = "UNVERIFIABLE";
    const citationSources = (raw.citations ?? [])
      .filter((u): u is string => typeof u === "string" && u.startsWith("http"))
      .slice(0, 3);

    const engineResult: EngineResult = { verdict: parsed, sources: citationSources };
    const validated = validateSources(engineResult, sources);

    if (validated.verdict.status !== engineResult.verdict.status) {
      console.warn(
        `Perplexity ${label} source validation downgraded: ` +
        `${engineResult.verdict.status} → ${validated.verdict.status} | ` +
        `cited sources: ${engineResult.sources.join(", ")}`,
      );
    } else {
      console.info(`Perplexity ${label} source validation passed | trusted sources: ${validated.sources.join(", ")}`);
    }

    return validated;
  } catch {
    console.error(`Perplexity ${label} failed to parse JSON: ${text}`);
    return null;
  }
}

// --- Source validation ---

function extractHostname(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return url.toLowerCase();
  }
}

function isDomainTrusted(url: string, trustedSources: string[]): boolean {
  const hostname = extractHostname(url);
  return trustedSources.some((domain) => {
    const normalised = domain.toLowerCase().replace(/^www\./, "");
    return hostname === normalised || hostname.endsWith("." + normalised);
  });
}

// validateSources() enforces three guarantees:
// 1. If LLM returns no citations → force UNVERIFIABLE
//    (prevents hallucinated verdicts with no evidence)
// 2. If LLM cites only untrusted domains → force UNVERIFIABLE
//    (prevents LLM from ignoring domain restriction prompt)
// 3. If LLM cites mix of trusted + untrusted → keep verdict
//    but strip untrusted URLs from sources array
function validateSources(result: EngineResult, trustedSources: string[]): EngineResult {
  if (result.sources.length === 0) {
    return {
      ...result,
      verdict: {
        ...result.verdict,
        status: "UNVERIFIABLE",
        confidence: "LOW",
        explanation: "Không có nguồn nào được trích dẫn để xác minh thông tin này.",
        source_quote: "",
      },
    };
  }

  const hasTrustedSource = result.sources.some((url) => isDomainTrusted(url, trustedSources));

  if (!hasTrustedSource) {
    return {
      ...result,
      sources: [],
      verdict: {
        ...result.verdict,
        status: "UNVERIFIABLE",
        confidence: "LOW",
        explanation: "Không tìm thấy bằng chứng từ các nguồn đáng tin cậy.",
        source_quote: "",
      },
    };
  }

  const trustedOnly = result.sources.filter((url) => isDomainTrusted(url, trustedSources));
  return { ...result, sources: trustedOnly };
}

// --- Main class ---

export class HybridVerificationService implements IVerificationService {
  constructor() {
    console.info(`HybridVerificationService initialized (single Perplexity architecture)`);
  }

  async verifyClaim(claim: string): Promise<VerifyResult> {
    const sources = getTrustedSources();

    const result = await runPerplexity(claim, sources, "call-1");
    console.info(`perplexity=${result?.verdict.status ?? "FAILED"}`);

    if (!result) {
      throw new Error("Perplexity verification failed");
    }

    return {
      verdict: {
        status: result.verdict.status === "UNVERIFIABLE" ? "FALSE" : result.verdict.status,
        explanation: result.verdict.explanation,
        source_quote: result.verdict.source_quote,
      },
      sources: result.sources,
      engine: result.verdict.status === "UNVERIFIABLE" ? "unverifiable" : "perplexity",
    };
  }
}


export { HybridVerificationService as PerplexityVerificationService };

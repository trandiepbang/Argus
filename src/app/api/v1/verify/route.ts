import { NextRequest, NextResponse } from "next/server";
import { VerifyClaimUseCase } from "@/application/use-cases/verify/verify-claim.use-case";
import { container } from "@/infrastructure/container";
import { auth } from "@/auth";

const LOG_PREFIX = `{app = "ssacb-chartbuilderapi"} |= "Client error from chartBuilderWeb"`;
const RATE_LIMIT_MAX = 20;

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.email ?? "anonymous";

  // Rate limit check
  const count = await container.rateLimitRepository.increment(userId);
  if (count > RATE_LIMIT_MAX) {
    return NextResponse.json(
      { success: false, error: `Rate limit exceeded — max ${RATE_LIMIT_MAX} requests per hour` },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    const msg = "Invalid JSON in request body";
    console.error(`${LOG_PREFIX} | ${msg}`);
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }

  const { claim } = body as Record<string, unknown>;

  if (typeof claim !== "string") {
    const msg = 'Missing or invalid field: "claim" must be a string';
    console.error(`${LOG_PREFIX} | ${msg}`);
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }

  try {
    const useCase = new VerifyClaimUseCase(container.verificationService, container.verificationResultRepository);
    const result = await useCase.execute({ claim });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    console.error(`${LOG_PREFIX} | ${msg}`);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

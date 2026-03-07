import { NextRequest, NextResponse } from "next/server";
import { VerifyClaimUseCase } from "@/application/use-cases/verify/verify-claim.use-case";
import { container } from "@/infrastructure/container";

const LOG_PREFIX = `{app = "ssacb-chartbuilderapi"} |= "Client error from chartBuilderWeb"`;

export async function POST(req: NextRequest) {
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

import { NextResponse } from "next/server";
import { openApiSpec } from "@/presentation/api/swagger/spec";

export async function GET() {
  return NextResponse.json(openApiSpec);
}

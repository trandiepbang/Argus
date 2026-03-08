import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { container } from "@/infrastructure/container";

export const runtime = "nodejs";

const BURST_MAX = 2;          // max 2 requests per second
const BURST_WINDOW = 1;       // 1 second
const HOURLY_MAX = 20;        // max 20 requests per hour
const HOURLY_WINDOW = 3600;   // 1 hour

export default auth(async (req) => {
  if (!req.auth) {
    return NextResponse.json(
      { success: false, error: "Unauthorized — sign in with Google at /api/auth/signin" },
      { status: 401 },
    );
  }

  const userId = req.auth.user?.email;
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized — no email associated with this account" },
      { status: 401 },
    );
  }

  const repo = container.rateLimitRepository;

  // 1. Burst check — prevents hammering within the same second
  const burstCount = await repo.increment(userId, BURST_WINDOW);
  if (burstCount > BURST_MAX) {
    return NextResponse.json(
      { success: false, error: `Too many requests — max ${BURST_MAX} per second` },
      { status: 429, headers: { "Retry-After": "1" } },
    );
  }

  // 2. Hourly check — prevents sustained abuse over time
  const hourlyCount = await repo.increment(userId, HOURLY_WINDOW);
  if (hourlyCount > HOURLY_MAX) {
    return NextResponse.json(
      { success: false, error: `Rate limit exceeded — max ${HOURLY_MAX} requests per hour` },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }
});

export const config = {
  matcher: ["/api/v1/:path*"],
};

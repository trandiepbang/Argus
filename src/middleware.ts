import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isApiV1 = req.nextUrl.pathname.startsWith("/api/v1/");

  if (isApiV1 && !req.auth) {
    return NextResponse.json(
      { success: false, error: "Unauthorized — sign in with Google at /api/auth/signin" },
      { status: 401 },
    );
  }
});

export const config = {
  matcher: ["/api/v1/:path*"],
};

import { NextRequest, NextResponse } from "next/server";

// Basic auth protects the dashboard pages.
// API routes (/api/*) are excluded — they use Bearer token auth instead.
export function middleware(request: NextRequest) {
  const auth = request.headers.get("authorization");

  if (auth) {
    const [scheme, encoded] = auth.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = Buffer.from(encoded, "base64").toString("utf-8");
      const [user, pass] = decoded.split(":");
      const validUser = process.env.DASHBOARD_USER ?? "admin";
      const validPass = process.env.DASHBOARD_PASS;

      if (validPass && user === validUser && pass === validPass) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Zone Tracker Dashboard"' },
  });
}

// Only protect dashboard pages, not API routes
export const config = {
  matcher: ["/", "/dashboard/:path*"],
};

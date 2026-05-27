// src/middleware.ts
// Gate admin pages and the opportunities API behind a session cookie.
// Runs on Edge — uses Web Crypto via auth-edge.ts, NOT node:crypto.

import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionEdge } from "@/lib/auth-edge";

// Paths under /admin/* and /api/admin/* that should NOT require auth.
const PUBLIC_PATHS = new Set(["/admin/login", "/api/admin/login"]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  const { valid } = await verifySessionEdge(cookie);
  if (valid) return NextResponse.next();

  // Unauthenticated: API routes get 401 JSON; HTML routes redirect to login.
  if (
    pathname.startsWith("/api/opportunities") ||
    pathname.startsWith("/api/admin")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  const nextPath = pathname + (req.nextUrl.search || "");
  url.pathname = "/admin/login";
  url.search = `?next=${encodeURIComponent(nextPath)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/api/opportunities/:path*", "/api/admin/:path*"],
};

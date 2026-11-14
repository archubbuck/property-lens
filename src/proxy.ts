import { NextResponse, type NextRequest } from "next/server";
import { DEV_SESSION_COOKIE } from "@/server/auth/session";

// Next.js 16 renamed Middleware to Proxy (functionality unchanged); see
// node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md.
//
// This is an *optimistic* authentication check only (per Next.js guidance,
// Proxy must not be the sole authorization boundary). Every authenticated
// route handler and server component independently verifies the session via
// src/server/auth/session.ts before reading or mutating data.
const AUTHENTICATED_PREFIXES = [
  "/saved",
  "/usage",
  "/billing",
  "/support",
  "/admin",
];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requiresAuth = AUTHENTICATED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!requiresAuth) return NextResponse.next();

  const hasSessionCookie = request.cookies.has(DEV_SESSION_COOKIE) || request.cookies.has("__session");
  if (hasSessionCookie) return NextResponse.next();

  const signInUrl = new URL("/sign-in", request.url);
  signInUrl.searchParams.set("redirect_url", pathname);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: ["/saved/:path*", "/usage/:path*", "/billing/:path*", "/support/:path*", "/admin/:path*"],
};

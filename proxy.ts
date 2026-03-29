import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const protectedPrefixes = [
  "/dashboard",
  "/services",
  "/alerts",
  "/reports",
  "/docs",
  "/settings",
  "/admin",
  "/operator",
  "/viewer",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requiresAuth = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (!requiresAuth) {
    return NextResponse.next();
  }

  const hasSessionCookie = request.cookies.get("monitoring_session")?.value === "1";

  if (hasSessionCookie) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/services/:path*",
    "/alerts/:path*",
    "/reports/:path*",
    "/docs/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/operator/:path*",
    "/viewer/:path*",
  ],
};
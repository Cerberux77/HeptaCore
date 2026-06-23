import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isPublicPath(path: string): boolean {
  if (/^\/api\/tenants\/[^/]+\/assets\/upload$/.test(path)) return true;
  if (/^\/api\/tenants\/[^/]+\/assets\/[^/]+\/content\/upload$/.test(path)) return true;
  if (path === "/") return true;
  if (path === "/login") return true;
  if (path === "/app") return true;
  if (path === "/access-required") return true;
  if (path === "/register") return true;
  if (path === "/recover") return true;
  if (path === "/reset-password") return true;
  if (path === "/admin") return true;
  if (path === "/icon.svg") return true;
  if (path === "/favicon.ico") return true;
  if (path === "/privacy") return true;
  if (path === "/terms") return true;
  if (path === "/data-deletion") return true;
  if (path === "/api/assistant") return true;
  if (path.startsWith("/brand/")) return true;
  if (path.startsWith("/_next/")) return true;
  if (path.startsWith("/api/auth/")) return true;
  if (path.startsWith("/api/oauth/")) return true;
  if (path.startsWith("/tenant/")) return true;
  if (path.startsWith("/api/tenant-assets/")) return true;
  if (path.startsWith("/tenant-assets/")) return true;
  if (path.startsWith("/api/cron/")) return true;
  return false;
}

export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (isPublicPath(path)) {
    return NextResponse.next();
  }

  const isLoggedIn =
    req.cookies.has("authjs.session-token") ||
    req.cookies.has("__Secure-authjs.session-token") ||
    req.cookies.has("next-auth.session-token") ||
    req.cookies.has("__Secure-next-auth.session-token");

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", `${req.nextUrl.pathname}${req.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|brand|api/tenant-assets|tenant-assets).*)"],
};

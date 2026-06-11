import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default function middleware(req: NextRequest) {
  const isLoggedIn =
    req.cookies.has("authjs.session-token") ||
    req.cookies.has("__Secure-authjs.session-token") ||
    req.cookies.has("next-auth.session-token") ||
    req.cookies.has("__Secure-next-auth.session-token");
  const path = req.nextUrl.pathname;

  // Allow public routes
  if (
    path === "/" ||
    path === "/login" ||
    path === "/register" ||
    path === "/recover" ||
    path === "/reset-password" ||
    path.startsWith("/api/auth/")
  ) {
    return NextResponse.next();
  }

  // Require auth for everything else
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|api/tenant-assets|tenant-assets).*)"],
};

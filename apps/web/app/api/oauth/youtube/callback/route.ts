import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../lib/auth";
import { buildTenantReturnPath, completeYoutubeOAuth, youtubeOAuthConfig } from "../../../../../lib/youtube-oauth";

export const dynamic = "force-dynamic";

function clearStateCookie(response: NextResponse) {
  response.cookies.set({
    name: youtubeOAuthConfig.cookieName,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    expires: new Date(0),
  });
}

export async function GET(req: NextRequest) {
  const state = req.nextUrl.searchParams.get("state") || "";
  const code = req.nextUrl.searchParams.get("code") || "";
  const tenantHint = req.nextUrl.searchParams.get("tenant") || "";

  const session = await auth();
  const fallbackPath = tenantHint ? buildTenantReturnPath(tenantHint) : "/app?oauth=youtube_error";

  if (!session?.user?.id) {
    const response = NextResponse.redirect(new URL(`${fallbackPath}${fallbackPath.includes("?") ? "&" : "?"}oauth=youtube_auth_required`, req.url));
    clearStateCookie(response);
    response.cookies.set({
      name: youtubeOAuthConfig.cookieName,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: req.nextUrl.protocol === "https:",
      path: "/",
      expires: new Date(0),
    });
    return response;
  }

  if (!code || !state) {
    const response = NextResponse.redirect(new URL(`${fallbackPath}${fallbackPath.includes("?") ? "&" : "?"}oauth=youtube_error`, req.url));
    response.cookies.set({
      name: youtubeOAuthConfig.cookieName,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: req.nextUrl.protocol === "https:",
      path: "/",
      expires: new Date(0),
    });
    return response;
  }

  try {
    const result = await completeYoutubeOAuth({
      code,
      stateParam: state,
      stateCookieValue: req.cookies.get(youtubeOAuthConfig.cookieName)?.value ?? null,
      requestOrigin: req.nextUrl.origin,
      requestUrl: req.url,
      userId: session.user.id,
    });

    const response = NextResponse.redirect(new URL(result.returnTo, req.url));
    response.cookies.set({
      name: youtubeOAuthConfig.cookieName,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: req.nextUrl.protocol === "https:",
      path: "/",
      expires: new Date(0),
    });
    return response;
  } catch {
    const response = NextResponse.redirect(new URL(`${fallbackPath}${fallbackPath.includes("?") ? "&" : "?"}oauth=youtube_error`, req.url));
    response.cookies.set({
      name: youtubeOAuthConfig.cookieName,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: req.nextUrl.protocol === "https:",
      path: "/",
      expires: new Date(0),
    });
    return response;
  }
}

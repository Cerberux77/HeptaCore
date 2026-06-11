import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state") || "turpial-sound";

  if (!code) {
    const error = req.nextUrl.searchParams.get("error_description") || req.nextUrl.searchParams.get("error") || "no code provided";
    return NextResponse.json({ error, ok: false }, { status: 400 });
  }

  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || `https://heptacore.vercel.app/api/oauth/instagram/callback`;

  if (!appId || !appSecret) {
    return NextResponse.json({ error: "Instagram OAuth not configured", ok: false }, { status: 500 });
  }

  try {
    const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      }),
    });

    const data = await tokenRes.json();

    if (!tokenRes.ok || !data.access_token) {
      return NextResponse.json({
        ok: false,
        error: data.error_message || data.error || "Token exchange failed",
        details: data,
      }, { status: 400 });
    }

    return NextResponse.redirect(`/tenant/${state}?oauth=instagram_connected`);
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : "OAuth callback failed",
    }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

const instagramAuthorizeUrl = "https://www.instagram.com/oauth/authorize";
const defaultRedirectUri = "https://heptacore.vercel.app/api/oauth/instagram/callback";

function encodeState(tenantSlug: string, nonce: string) {
  return Buffer.from(JSON.stringify({ tenantSlug, nonce, csrf: "pending-session-binding" })).toString("base64url");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantSlug = searchParams.get("tenant") || "turpial-sound";
  const nonce = crypto.randomUUID();
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || defaultRedirectUri;
  const appId = process.env.INSTAGRAM_APP_ID;

  if (!appId) {
    return NextResponse.json(
      {
        ok: false,
        provider: "instagram",
        message: "INSTAGRAM_APP_ID is required to generate the authorization URL."
      },
      { status: 500 }
    );
  }

  const url = new URL(instagramAuthorizeUrl);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "instagram_business_basic,instagram_business_content_publish");
  url.searchParams.set("state", encodeState(tenantSlug, nonce));

  return NextResponse.json({
    ok: true,
    provider: "instagram",
    tenantSlug,
    authorizationUrl: url.toString(),
    redirectUri,
    stateDesign: "base64url JSON with tenantSlug, nonce, and CSRF placeholder; bind nonce to a server session before storing tokens."
  });
}


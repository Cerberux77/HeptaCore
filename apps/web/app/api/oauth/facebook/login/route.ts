import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import crypto from "node:crypto";

function buildOrigin(): string | null {
  const raw =
    process.env.APP_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.VERCEL_URL ||
    null;

  if (!raw) return null;

  const base = raw.replace(/\r/g, "").replace(/\n/g, "").trim().replace(/\/+$/, "");
  if (!base) return null;

  if (base.startsWith("https://") || base.startsWith("http://")) return base;
  return `https://${base}`;
}

function encodeState(payload: Record<string, string>): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json, "utf-8").toString("base64url");
}

export async function GET(req: NextRequest) {
  const tenantSlug = req.nextUrl.searchParams.get("tenant") || "";
  const pageId = req.nextUrl.searchParams.get("pageId") || undefined;

  if (!tenantSlug.trim()) {
    return NextResponse.json({ error: "Missing tenant parameter", ok: false }, { status: 400 });
  }

  const clientId = process.env.FACEBOOK_CLIENT_ID || process.env.META_APP_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Facebook OAuth not configured", ok: false }, { status: 500 });
  }

  const origin = buildOrigin();
  if (!origin) {
    return NextResponse.json({ error: "APP_PUBLIC_URL or NEXT_PUBLIC_APP_URL not configured", ok: false }, { status: 500 });
  }

  const redirectUri = `${origin}/api/oauth/facebook/callback`;

  const statePayload: Record<string, string> = {
    tenant: tenantSlug.trim(),
    nonce: crypto.randomBytes(8).toString("hex"),
  };
  if (pageId) statePayload.pageId = pageId;

  const state = encodeState(statePayload);

  const scope = "pages_show_list,pages_read_engagement,pages_manage_posts";

  const authUrl = new URL("https://www.facebook.com/v25.0/dialog/oauth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("response_type", "code");

  return NextResponse.redirect(authUrl.toString());
}

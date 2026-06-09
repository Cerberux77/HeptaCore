import { NextResponse } from "next/server";
import {
  getConfiguredInstagramRedirectUri,
  getInstagramRedirectUri,
  getSafeInstagramRedirectUri
} from "../../../../../lib/instagram-oauth";
import { canPersistEncryptedTokens } from "../../../../../lib/token-vault";

const tokenUrl = "https://api.instagram.com/oauth/access_token";

function parseState(state: string | null) {
  if (!state) return null;
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as {
      tenantSlug?: string;
      nonce?: string;
      csrf?: string;
      redirectUri?: string;
    };
    return {
      tenantSlug: parsed.tenantSlug ?? null,
      nonceReceived: Boolean(parsed.nonce),
      csrf: parsed.csrf ?? "missing",
      redirectUri: getSafeInstagramRedirectUri(parsed.redirectUri),
      redirectUriReceived: Boolean(parsed.redirectUri)
    };
  } catch {
    return {
      tenantSlug: state,
      nonceReceived: false,
      csrf: "unparsed-legacy-state",
      redirectUri: null,
      redirectUriReceived: false
    };
  }
}

async function exchangeCode(code: string, redirectUri: string) {
  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;

  if (!appId || !appSecret) {
    return {
      ok: false,
      status: 500,
      body: {
        ok: false,
        provider: "instagram",
        codeReceived: true,
        tokenReceived: false,
        message: "Instagram OAuth env vars are incomplete.",
        missingEnv: {
          INSTAGRAM_APP_ID: !appId,
          INSTAGRAM_APP_SECRET: !appSecret
        }
      }
    };
  }

  const body = new FormData();
  body.set("client_id", appId);
  body.set("client_secret", appSecret);
  body.set("grant_type", "authorization_code");
  body.set("redirect_uri", redirectUri);
  body.set("code", code);

  const response = await fetch(tokenUrl, {
    method: "POST",
    body
  });

  const payload = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    user_id?: string | number;
    error_type?: string;
    code?: number;
    error_message?: string;
  };

  if (!response.ok || !payload.access_token) {
    return {
      ok: false,
      status: 400,
      body: {
        ok: false,
        provider: "instagram",
        codeReceived: true,
        tokenReceived: false,
        errorType: payload.error_type ?? "token_exchange_failed",
        errorCode: payload.code ?? response.status,
        message: payload.error_message ?? "Instagram token exchange failed."
      }
    };
  }

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      provider: "instagram",
      codeReceived: true,
      tokenReceived: true,
      expiresIn: payload.expires_in ?? null,
      providerUserIdReceived: Boolean(payload.user_id),
      redirectUriSource: "request-origin",
      tokenStored: false,
      storageBlockedBy: canPersistEncryptedTokens()
        ? "vault_adapter_not_implemented"
        : "missing_ENCRYPTION_KEY",
      message: "Token exchange succeeded. Access token was not returned, logged, or stored."
    }
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorReason = searchParams.get("error_reason");
  const errorDescription = searchParams.get("error_description");
  const parsedState = parseState(state);
  const fallbackRedirectUri = getInstagramRedirectUri(request);
  const redirectUri = parsedState?.redirectUri ?? fallbackRedirectUri;
  const redirectUriSource = parsedState?.redirectUri ? "state" : "request-origin";
  const configuredRedirectUri = getConfiguredInstagramRedirectUri();

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        provider: "instagram",
        codeReceived: false,
        tokenReceived: false,
        error,
        errorReason,
        errorDescription,
        state: parsedState,
        redirectUri,
        redirectUriSource,
        configuredRedirectUri
      },
      { status: 400 }
    );
  }

  if (!code) {
    return NextResponse.json({
      ok: true,
      provider: "instagram",
      codeReceived: false,
      tokenReceived: false,
      state: parsedState,
      redirectUri,
      redirectUriSource,
      configuredRedirectUri,
      message: "Callback received. No authorization code was provided."
    });
  }

  const exchanged = await exchangeCode(code, redirectUri);

  return NextResponse.json(
    {
      ...exchanged.body,
      redirectUriSource,
      state: parsedState,
      redirectUri,
      configuredRedirectUri
    },
    { status: exchanged.status }
  );
}

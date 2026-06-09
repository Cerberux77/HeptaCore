import { NextResponse } from "next/server";
import {
  getConfiguredInstagramRedirectUri,
  getInstagramRedirectUri,
  getSafeInstagramRedirectUri
} from "../../../../../lib/instagram-oauth";
import { canPersistEncryptedTokens } from "../../../../../lib/token-vault";

const tokenUrl = "https://api.instagram.com/oauth/access_token";
const requestContentType = "application/x-www-form-urlencoded";

function last4(value: string | undefined) {
  return value ? value.slice(-4) : null;
}

function redactSensitiveTokenText(value: string) {
  return value
    .replace(/("access_token"\s*:\s*")[^"]+/gi, "$1[redacted]")
    .replace(/("client_secret"\s*:\s*")[^"]+/gi, "$1[redacted]")
    .replace(/(access_token=)[^&\s"]+/gi, "$1[redacted]")
    .replace(/(client_secret=)[^&\s"]+/gi, "$1[redacted]");
}

type InstagramTokenPayload = {
  access_token?: string;
  expires_in?: number;
  user_id?: string | number;
  error_type?: string;
  code?: number;
  error_message?: string;
};

function parseTokenPayload(rawBody: string): InstagramTokenPayload {
  try {
    return JSON.parse(rawBody || "{}") as InstagramTokenPayload;
  } catch {
    return {};
  }
}

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
  const diagnostics = {
    tokenEndpoint: tokenUrl,
    requestContentType,
    appIdUsedLast4: last4(appId),
    appIdExpectedLast4: last4(process.env.INSTAGRAM_APP_ID),
    appSecretPresent: Boolean(appSecret),
    appSecretLength: appSecret?.length ?? 0,
    redirectUriUsedForExchange: redirectUri,
    redirectUriLength: redirectUri.length,
    codeLength: code.length
  };

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
        },
        ...diagnostics
      }
    };
  }

  const body = new URLSearchParams();
  body.set("client_id", appId);
  body.set("client_secret", appSecret);
  body.set("grant_type", "authorization_code");
  body.set("redirect_uri", redirectUri);
  body.set("code", code);

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": requestContentType
    },
    body: body.toString()
  });

  const rawBody = await response.text();
  const tokenRawErrorBody = redactSensitiveTokenText(rawBody);
  const payload = parseTokenPayload(rawBody);

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
        message: payload.error_message ?? "Instagram token exchange failed.",
        tokenHttpStatus: response.status,
        tokenRawErrorBody,
        ...diagnostics
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
      tokenEndpoint: tokenUrl,
      requestContentType,
      appIdUsedLast4: last4(appId),
      redirectUriUsedForExchange: redirectUri,
      redirectUriLength: redirectUri.length,
      codeLength: code.length,
      tokenHttpStatus: response.status,
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

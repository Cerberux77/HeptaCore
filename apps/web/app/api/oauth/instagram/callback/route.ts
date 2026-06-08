import { NextResponse } from "next/server";
import { canPersistEncryptedTokens } from "../../../../../lib/token-vault";

const tokenUrl = "https://api.instagram.com/oauth/access_token";

function parseState(state: string | null) {
  if (!state) return null;
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as {
      tenantSlug?: string;
      nonce?: string;
      csrf?: string;
    };
    return {
      tenantSlug: parsed.tenantSlug ?? null,
      nonceReceived: Boolean(parsed.nonce),
      csrf: parsed.csrf ?? "missing"
    };
  } catch {
    return {
      tenantSlug: state,
      nonceReceived: false,
      csrf: "unparsed-legacy-state"
    };
  }
}

async function exchangeCode(code: string) {
  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;

  if (!appId || !appSecret || !redirectUri) {
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
          INSTAGRAM_APP_SECRET: !appSecret,
          INSTAGRAM_REDIRECT_URI: !redirectUri
        }
      }
    };
  }

  const body = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
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
        state: parsedState
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
      message: "Callback received. No authorization code was provided."
    });
  }

  const exchanged = await exchangeCode(code);

  return NextResponse.json(
    {
      ...exchanged.body,
      state: parsedState
    },
    { status: exchanged.status }
  );
}

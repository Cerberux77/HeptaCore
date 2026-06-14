import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { encryptJson } from "../../../../../lib/token-vault";

function formatOAuthError(resJson: unknown, status: number): string {
  const err = (resJson as Record<string, unknown>)?.error as Record<string, unknown> | undefined;
  if (!err) return `HTTP ${status}: unknown error`;
  const parts: string[] = [];
  if (err.message) parts.push(String(err.message));
  if (err.type) parts.push(`type=${err.type}`);
  if (err.code) parts.push(`code=${err.code}`);
  if (err.error_subcode) parts.push(`subcode=${err.error_subcode}`);
  return parts.join(" | ") || `HTTP ${status}: error without details`;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state") || "";

  if (!code) {
    const errorDesc = req.nextUrl.searchParams.get("error_description") || req.nextUrl.searchParams.get("error") || "no code provided";
    return NextResponse.json({ error: errorDesc, ok: false }, { status: 400 });
  }

  const tenantSlug = state.trim();
  if (!tenantSlug) {
    return NextResponse.json({ error: "Missing tenant slug in state parameter", ok: false }, { status: 400 });
  }

  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET || appSecret;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || `https://heptacore.vercel.app/api/oauth/instagram/callback`;

  if (!appId || !appSecret) {
    return NextResponse.json({ error: "Instagram OAuth not configured", ok: false }, { status: 500 });
  }

  let tenant;
  try {
    tenant = await prisma.tenant.findFirst({
      where: { slug: tenantSlug },
      select: { id: true, slug: true },
    });
  } catch {
    return NextResponse.json({ error: "Database error looking up tenant", ok: false }, { status: 500 });
  }

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found for the given state", ok: false }, { status: 404 });
  }

  // Step 1: exchange code for short-lived token
  let shortTokenData;
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

    shortTokenData = await tokenRes.json();

    if (!tokenRes.ok || !shortTokenData.access_token) {
      const msg = formatOAuthError(shortTokenData, tokenRes.status);
      console.error("[instagram_callback_exchange_failed]", { status: tokenRes.status, error: msg });
      return NextResponse.json({
        ok: false,
        error: "Token exchange failed. Please try connecting again.",
      }, { status: 400 });
    }
  } catch (err) {
    console.error("[instagram_callback_exchange_error]", { message: err instanceof Error ? err.message : "unknown" });
    return NextResponse.json({
      ok: false,
      error: "OAuth provider communication failed. Please try again.",
    }, { status: 502 });
  }

  const shortAccessToken = shortTokenData.access_token as string;
  const userId = shortTokenData.user_id ? String(shortTokenData.user_id) : undefined;

  // Step 2: exchange short-lived token for long-lived token
  if (!clientSecret) {
    return NextResponse.json({
      ok: false,
      error: "Instagram client secret not configured for long-lived token exchange.",
    }, { status: 500 });
  }

  let longLivedData;
  try {
    const exchangeUrl = new URL("https://graph.instagram.com/access_token");
    exchangeUrl.searchParams.set("grant_type", "ig_exchange_token");
    exchangeUrl.searchParams.set("client_secret", clientSecret);
    exchangeUrl.searchParams.set("access_token", shortAccessToken);

    const exchangeRes = await fetch(exchangeUrl.toString(), {
      signal: AbortSignal.timeout(15000),
    });

    longLivedData = await exchangeRes.json();

    if (!exchangeRes.ok || !longLivedData.access_token) {
      const msg = formatOAuthError(longLivedData, exchangeRes.status);
      console.error("[instagram_callback_long_lived_failed]", { status: exchangeRes.status, error: msg });
      return NextResponse.json({
        ok: false,
        error: "Failed to obtain long-lived token. Please try connecting again.",
      }, { status: 400 });
    }
  } catch (err) {
    console.error("[instagram_callback_long_lived_error]", { message: err instanceof Error ? err.message : "unknown" });
    return NextResponse.json({
      ok: false,
      error: "Long-lived token exchange failed. Please try again.",
    }, { status: 502 });
  }

  const longAccessToken = longLivedData.access_token as string;
  const expiresInSec = typeof longLivedData.expires_in === "number" ? longLivedData.expires_in : undefined;
  const tokenType = (longLivedData.token_type as string) || "bearer";

  const expiresAt = expiresInSec
    ? new Date(Date.now() + expiresInSec * 1000)
    : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

  let encryptedBlob: Buffer;
  try {
    encryptedBlob = encryptJson({
      access_token: longAccessToken,
      token_type: tokenType,
      expires_in: expiresInSec,
      user_id: userId,
      provider: "INSTAGRAM",
      obtained_at: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Credential encryption failed", ok: false }, { status: 500 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const credential = await tx.credentialVaultItem.create({
        data: {
          tenantId: tenant.id,
          provider: "INSTAGRAM",
          label: "instagram_oauth",
          encryptedBlob: new Uint8Array(encryptedBlob),
          keyVersion: "v1",
          expiresAt,
        },
      });

      const scopes = [
        "instagram_business_basic",
        "instagram_business_manage_messages",
        "instagram_business_manage_comments",
        "instagram_business_content_publish",
      ];

      let socialAccountId: string;

      if (userId) {
        const exact = await tx.socialAccount.findFirst({
          where: { tenantId: tenant.id, network: "INSTAGRAM", externalAccountId: userId },
          select: { id: true },
        });

        if (exact) {
          await tx.socialAccount.update({
            where: { id: exact.id },
            data: { status: "connected", scopes, updatedAt: new Date() },
          });
          socialAccountId = exact.id;
        } else {
          const fallback = await tx.socialAccount.findFirst({
            where: { tenantId: tenant.id, network: "INSTAGRAM", externalAccountId: null },
            select: { id: true },
            orderBy: { createdAt: "desc" },
          });

          if (fallback) {
            await tx.socialAccount.update({
              where: { id: fallback.id },
              data: { status: "connected", externalAccountId: userId, scopes, updatedAt: new Date() },
            });
            socialAccountId = fallback.id;
          } else {
            const created = await tx.socialAccount.create({
              data: {
                tenantId: tenant.id,
                network: "INSTAGRAM",
                status: "connected",
                externalAccountId: userId,
                scopes,
              },
            });
            socialAccountId = created.id;
          }
        }
      } else {
        const fallback = await tx.socialAccount.findFirst({
          where: { tenantId: tenant.id, network: "INSTAGRAM", externalAccountId: null },
          select: { id: true },
          orderBy: { createdAt: "desc" },
        });

        if (fallback) {
          await tx.socialAccount.update({
            where: { id: fallback.id },
            data: { status: "connected", scopes, updatedAt: new Date() },
          });
          socialAccountId = fallback.id;
        } else {
          const created = await tx.socialAccount.create({
            data: {
              tenantId: tenant.id,
              network: "INSTAGRAM",
              status: "connected",
              scopes,
            },
          });
          socialAccountId = created.id;
        }
      }

      const existingOAuth = await tx.oAuthConnection.findFirst({
        where: { tenantId: tenant.id, provider: "INSTAGRAM" },
        select: { id: true },
      });

      const now = new Date();

      if (existingOAuth) {
        await tx.oAuthConnection.update({
          where: { id: existingOAuth.id },
          data: {
            status: "connected",
            tokenRef: credential.id,
            socialAccountId,
            connectedAt: now,
            updatedAt: now,
            expiresAt,
          },
        });
      } else {
        await tx.oAuthConnection.create({
          data: {
            id: `oa_${tenant.id}_instagram`,
            tenantId: tenant.id,
            provider: "INSTAGRAM",
            providerUserId: userId,
            scopes,
            status: "connected",
            tokenRef: credential.id,
            socialAccountId,
            connectedAt: now,
            updatedAt: now,
            expiresAt,
          },
        });
      }
    });
  } catch (err) {
    const error = err as {
      name?: string;
      message?: string;
      code?: string;
      meta?: unknown;
      stack?: string;
    };

    console.error("[instagram_callback_save_failed]", {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
    });

    return NextResponse.json({
      ok: false,
      error: "Failed to save Instagram connection. Please try again.",
      code: "INSTAGRAM_CONNECTION_SAVE_FAILED",
    }, { status: 500 });
  }

  const successUrl = new URL(`/tenant/${tenantSlug}`, req.url);
  successUrl.searchParams.set("oauth", "instagram_connected");
  return NextResponse.redirect(successUrl);
}

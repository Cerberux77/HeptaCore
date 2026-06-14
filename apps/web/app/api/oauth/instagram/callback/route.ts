import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { encryptJson } from "../../../../../lib/token-vault";

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

  let tokenData;
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

    tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      return NextResponse.json({
        ok: false,
        error: "Token exchange failed. Please try connecting again.",
      }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: "OAuth provider communication failed. Please try again.",
    }, { status: 502 });
  }

  const accessToken = tokenData.access_token as string;
  const userId = tokenData.user_id ? String(tokenData.user_id) : undefined;

  let encryptedBlob: Buffer;
  try {
    encryptedBlob = encryptJson({
      access_token: accessToken,
      user_id: userId,
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
          expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
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
            expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
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
            expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
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

  return NextResponse.redirect(`/tenant/${tenantSlug}?oauth=instagram_connected`);
}

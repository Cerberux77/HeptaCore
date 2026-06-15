import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { encryptJson } from "../../../../../lib/token-vault";

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

function decodeState(encoded: string): Record<string, string> | null {
  try {
    const json = Buffer.from(encoded, "base64url").toString("utf-8");
    const parsed = JSON.parse(json);
    if (typeof parsed !== "object" || !parsed.tenant) return null;
    return parsed;
  } catch {
    return null;
  }
}

function formatOAuthError(resJson: unknown, status: number): string {
  const err = (resJson as Record<string, unknown>)?.error as Record<string, unknown> | undefined;
  if (!err) return `HTTP ${status}: unknown error`;
  const parts: string[] = [];
  if (err.message) parts.push(String(err.message));
  if (err.type) parts.push(`type=${err.type}`);
  if (err.code) parts.push(`code=${err.code}`);
  if (err.error_subcode) parts.push(`subcode=${err.error_subcode}`);
  const fbtrace = (resJson as Record<string, unknown>)?.fbtrace_id;
  if (fbtrace) parts.push(`trace=${fbtrace}`);
  return parts.join(" | ") || `HTTP ${status}: error without details`;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const stateParam = req.nextUrl.searchParams.get("state") || "";

  if (!code) {
    const errorDesc = req.nextUrl.searchParams.get("error_description") || req.nextUrl.searchParams.get("error") || "no code provided";
    return NextResponse.json({ error: errorDesc, ok: false }, { status: 400 });
  }

  const state = decodeState(stateParam);
  if (!state) {
    return NextResponse.json({ error: "Invalid state parameter", ok: false }, { status: 400 });
  }

  const tenantSlug = String(state.tenant).trim();
  const requestedPageId = state.pageId ? String(state.pageId) : undefined;

  if (!tenantSlug) {
    return NextResponse.json({ error: "Missing tenant slug in state parameter", ok: false }, { status: 400 });
  }

  const clientId = process.env.FACEBOOK_CLIENT_ID || process.env.META_APP_ID;
  const clientSecret = process.env.FACEBOOK_CLIENT_SECRET || process.env.META_APP_SECRET;
  const envPageId = process.env.FACEBOOK_PAGE_ID || process.env.META_PAGE_ID || undefined;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Facebook OAuth not configured", ok: false }, { status: 500 });
  }

  const origin = buildOrigin();
  if (!origin) {
    return NextResponse.json({ error: "APP_PUBLIC_URL or NEXT_PUBLIC_APP_URL not configured", ok: false }, { status: 500 });
  }

  const redirectUri = `${origin}/api/oauth/facebook/callback`;

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

  // Step 1: exchange code for user short-lived token
  let shortTokenData;
  try {
    const tokenUrl = new URL("https://graph.facebook.com/v25.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", clientId);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("client_secret", clientSecret);
    tokenUrl.searchParams.set("code", code);

    const tokenRes = await fetch(tokenUrl.toString());
    shortTokenData = await tokenRes.json();

    if (!tokenRes.ok || !shortTokenData.access_token) {
      const msg = formatOAuthError(shortTokenData, tokenRes.status);
      console.error("[facebook_callback_exchange_failed]", { status: tokenRes.status, error: msg });
      return NextResponse.json({ ok: false, error: "Token exchange failed. Please try connecting again." }, { status: 400 });
    }
  } catch (err) {
    console.error("[facebook_callback_exchange_error]", { message: err instanceof Error ? err.message : "unknown" });
    return NextResponse.json({ ok: false, error: "OAuth provider communication failed. Please try again." }, { status: 502 });
  }

  const userShortToken = shortTokenData.access_token as string;

  // Step 2: exchange short-lived for long-lived user token
  let longTokenData;
  try {
    const exchangeUrl = new URL("https://graph.facebook.com/v25.0/oauth/access_token");
    exchangeUrl.searchParams.set("grant_type", "fb_exchange_token");
    exchangeUrl.searchParams.set("client_id", clientId);
    exchangeUrl.searchParams.set("client_secret", clientSecret);
    exchangeUrl.searchParams.set("fb_exchange_token", userShortToken);

    const exchangeRes = await fetch(exchangeUrl.toString(), {
      signal: AbortSignal.timeout(15000),
    });

    longTokenData = await exchangeRes.json();

    if (!exchangeRes.ok || !longTokenData.access_token) {
      const msg = formatOAuthError(longTokenData, exchangeRes.status);
      console.error("[facebook_callback_long_lived_failed]", { status: exchangeRes.status, error: msg });
      return NextResponse.json({ ok: false, error: "Failed to obtain long-lived token. Please try again." }, { status: 400 });
    }
  } catch (err) {
    console.error("[facebook_callback_long_lived_error]", { message: err instanceof Error ? err.message : "unknown" });
    return NextResponse.json({ ok: false, error: "Long-lived token exchange failed. Please try again." }, { status: 502 });
  }

  const longUserToken = longTokenData.access_token as string;
  const userExpiresIn = typeof longTokenData.expires_in === "number" ? longTokenData.expires_in : undefined;

  // Step 3: get pages
  let pagesData;
  try {
    const pagesUrl = new URL("https://graph.facebook.com/v25.0/me/accounts");
    pagesUrl.searchParams.set("fields", "id,name,access_token,category,tasks");
    pagesUrl.searchParams.set("access_token", longUserToken);

    const pagesRes = await fetch(pagesUrl.toString());
    pagesData = await pagesRes.json();

    if (!pagesRes.ok) {
      const msg = formatOAuthError(pagesData, pagesRes.status);
      console.error("[facebook_callback_pages_failed]", { status: pagesRes.status, error: msg });
      return NextResponse.json({ ok: false, error: "Failed to retrieve Facebook Pages. Please try again." }, { status: 409 });
    }
  } catch (err) {
    console.error("[facebook_callback_pages_error]", { message: err instanceof Error ? err.message : "unknown" });
    return NextResponse.json({ ok: false, error: "Page retrieval failed. Please try again." }, { status: 502 });
  }

  const pages: Array<{ id: string; name: string; access_token: string; category: string; tasks: string[] }> =
    (pagesData.data as any[]) || [];

  if (pages.length === 0) {
    return NextResponse.json({
      ok: false,
      code: "FACEBOOK_NO_PAGES",
      error: "No Facebook Pages found for your account. Create a Page first.",
      action: "Create a Facebook Page at https://www.facebook.com/pages/create",
    }, { status: 409 });
  }

  // Step 4: select page
  let selectedPage: (typeof pages)[0] | undefined;

  if (requestedPageId) {
    selectedPage = pages.find((p) => p.id === requestedPageId);
  }
  if (!selectedPage && envPageId) {
    selectedPage = pages.find((p) => p.id === envPageId);
  }
  if (!selectedPage && pages.length === 1) {
    selectedPage = pages[0];
  }

  if (!selectedPage) {
    const safePages = pages.map((p) => ({ id: p.id, name: p.name, category: p.category, tasks: p.tasks }));
    return NextResponse.json({
      ok: false,
      code: "FACEBOOK_PAGE_SELECTION_REQUIRED",
      error: "Multiple Facebook Pages found. Specify pageId to continue.",
      pages: safePages,
      action: `Retry /api/oauth/facebook/login?tenant=${tenantSlug}&pageId=<PAGE_ID>`,
    }, { status: 409 });
  }

  // We don't use the long user token — only the page token
  const pageAccessToken = selectedPage.access_token;

  // Calculate expiresAt
  const expiresAt = userExpiresIn
    ? new Date(Date.now() + userExpiresIn * 1000)
    : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

  let encryptedBlob: Buffer;
  try {
    encryptedBlob = encryptJson({
      access_token: pageAccessToken,
      provider: "FACEBOOK",
      token_type: "bearer",
      page_id: selectedPage.id,
      page_name: selectedPage.name,
      obtained_at: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Credential encryption failed", ok: false }, { status: 500 });
  }

  const scopes = ["pages_show_list", "pages_read_engagement", "pages_manage_posts"];

  try {
    await prisma.$transaction(async (tx) => {
      const credential = await tx.credentialVaultItem.create({
        data: {
          tenantId: tenant.id,
          provider: "FACEBOOK",
          label: "facebook_page_oauth",
          encryptedBlob: new Uint8Array(encryptedBlob),
          keyVersion: "v1",
          expiresAt,
        },
      });

      let socialAccountId: string;

      const exact = await tx.socialAccount.findFirst({
        where: { tenantId: tenant.id, network: "FACEBOOK", externalAccountId: selectedPage.id },
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
          where: { tenantId: tenant.id, network: "FACEBOOK", externalAccountId: null },
          select: { id: true },
          orderBy: { createdAt: "desc" },
        });

        if (fallback) {
          await tx.socialAccount.update({
            where: { id: fallback.id },
            data: { status: "connected", externalAccountId: selectedPage.id, scopes, updatedAt: new Date() },
          });
          socialAccountId = fallback.id;
        } else {
          const created = await tx.socialAccount.create({
            data: {
              tenantId: tenant.id,
              network: "FACEBOOK",
              status: "connected",
              externalAccountId: selectedPage.id,
              scopes,
            },
          });
          socialAccountId = created.id;
        }
      }

      const existingOAuth = await tx.oAuthConnection.findFirst({
        where: { tenantId: tenant.id, provider: "FACEBOOK" },
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
            providerUserId: selectedPage.id,
            scopes,
            connectedAt: now,
            updatedAt: now,
            expiresAt,
          },
        });
      } else {
        await tx.oAuthConnection.create({
          data: {
            id: `oa_${tenant.id}_facebook`,
            tenantId: tenant.id,
            provider: "FACEBOOK",
            providerUserId: selectedPage.id,
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

    console.error("[facebook_callback_save_failed]", {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
    });

    return NextResponse.json({
      ok: false,
      error: "Failed to save Facebook connection. Please try again.",
      code: "FACEBOOK_CONNECTION_SAVE_FAILED",
    }, { status: 500 });
  }

  const successUrl = new URL(`/tenant/${tenantSlug}`, req.url);
  successUrl.searchParams.set("oauth", "facebook_connected");
  return NextResponse.redirect(successUrl);
}

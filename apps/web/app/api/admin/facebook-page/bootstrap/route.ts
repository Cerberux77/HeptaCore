import { NextResponse } from "next/server";
import { auth } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { encryptJson } from "../../../../../lib/token-vault";

export const dynamic = "force-dynamic";

const ADMIN_ROLES = ["SUPER_ADMIN", "TENANT_ADMIN", "OWNER", "ADMIN"];

function formatMetaError(resJson: unknown, status: number): string {
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

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = session.user.memberships?.some(
    (m: { role: string }) => ADMIN_ROLES.includes(m.role)
  );
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden: admin role required" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || body.confirm !== "CONNECT_FACEBOOK_PAGE") {
    return NextResponse.json({ error: "Invalid confirmation token", ok: false }, { status: 400 });
  }

  const tenantSlug = String(body.tenantSlug ?? "").trim();
  if (!tenantSlug) {
    return NextResponse.json({ error: "tenantSlug is required", ok: false }, { status: 400 });
  }

  const pageId = process.env.FACEBOOK_PAGE_ID;
  const pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const clientId = process.env.FACEBOOK_CLIENT_ID;
  const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;

  if (!pageId || !pageAccessToken || !clientId || !clientSecret) {
    return NextResponse.json({
      ok: false,
      error: "Missing Facebook env vars. Set FACEBOOK_PAGE_ID, FACEBOOK_PAGE_ACCESS_TOKEN, FACEBOOK_CLIENT_ID, FACEBOOK_CLIENT_SECRET.",
    }, { status: 500 });
  }

  let tenant;
  try {
    tenant = await prisma.tenant.findFirst({
      where: { slug: tenantSlug },
      select: { id: true, slug: true, name: true },
    });
  } catch {
    return NextResponse.json({ error: "Database error looking up tenant", ok: false }, { status: 500 });
  }

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found", ok: false }, { status: 404 });
  }

  const requiredScopes = ["pages_show_list", "pages_read_engagement", "pages_manage_posts"];

  // Validate Page ID
  try {
    const pageUrl = new URL(`https://graph.facebook.com/v25.0/${pageId}`);
    pageUrl.searchParams.set("fields", "id,name,link");
    pageUrl.searchParams.set("access_token", pageAccessToken);

    const pageRes = await fetch(pageUrl.toString());
    const pageJson = await pageRes.json();

    if (!pageRes.ok || (pageJson as Record<string, unknown>)?.id !== pageId) {
      const msg = formatMetaError(pageJson, pageRes.status);
      console.error("[facebook_bootstrap_page_check_failed]", { status: pageRes.status, error: msg });
      return NextResponse.json({
        ok: false,
        code: "FACEBOOK_PAGE_TOKEN_INVALID",
        error: "Page ID validation failed. The page is not accessible with the provided token.",
      }, { status: 409 });
    }

    var pageName = (pageJson as Record<string, unknown>)?.name as string | undefined;
  } catch (err) {
    console.error("[facebook_bootstrap_page_check_error]", { message: err instanceof Error ? err.message : "unknown" });
    return NextResponse.json({ ok: false, error: "Failed to validate Page ID. Please try again." }, { status: 502 });
  }

  // Validate token via debug_token
  try {
    const debugUrl = new URL("https://graph.facebook.com/v25.0/debug_token");
    debugUrl.searchParams.set("input_token", pageAccessToken);
    debugUrl.searchParams.set("access_token", `${clientId}|${clientSecret}`);

    const debugRes = await fetch(debugUrl.toString());
    const debugJson = await debugRes.json();
    const debugData = (debugJson as Record<string, unknown>)?.data as Record<string, unknown> | undefined;

    if (!debugRes.ok || !debugData || debugData.is_valid !== true) {
      const msg = formatMetaError(debugJson, debugRes.status);
      console.error("[facebook_bootstrap_debug_token_failed]", { status: debugRes.status, error: msg });
      return NextResponse.json({
        ok: false,
        code: "FACEBOOK_PAGE_TOKEN_INVALID",
        error: "Page access token validation failed. The token is not valid.",
      }, { status: 409 });
    }

    const grantedScopes: string[] = Array.isArray(debugData.scopes) ? (debugData.scopes as string[]) : [];
    const missingScopes = requiredScopes.filter((s) => !grantedScopes.includes(s));

    if (missingScopes.length > 0) {
      console.error("[facebook_bootstrap_scopes_missing]", { missingScopes, grantedScopes });
      return NextResponse.json({
        ok: false,
        code: "FACEBOOK_REQUIRED_SCOPES_MISSING",
        error: `Missing required scopes: ${missingScopes.join(", ")}.`,
        missingScopes,
        grantedScopes,
      }, { status: 409 });
    }
  } catch (err) {
    console.error("[facebook_bootstrap_debug_token_error]", { message: err instanceof Error ? err.message : "unknown" });
    return NextResponse.json({ ok: false, error: "Failed to validate page token. Please try again." }, { status: 502 });
  }

  // Persist
  const now = new Date();

  let encryptedBlob: Buffer;
  try {
    encryptedBlob = encryptJson({
      access_token: pageAccessToken,
      provider: "FACEBOOK",
      token_type: "bearer",
      page_id: pageId,
      page_name: pageName,
      obtained_at: now.toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Credential encryption failed", ok: false }, { status: 500 });
  }

  try {
    let credentialId = "";
    let socialAccountId = "";
    let connectionId = "";

    await prisma.$transaction(async (tx) => {
      const credential = await tx.credentialVaultItem.create({
        data: {
          tenantId: tenant.id,
          provider: "FACEBOOK",
          label: "facebook_page_oauth",
          encryptedBlob: new Uint8Array(encryptedBlob),
          keyVersion: "v1",
          expiresAt: null,
        },
      });
      credentialId = credential.id;

      const exact = await tx.socialAccount.findFirst({
        where: { tenantId: tenant.id, network: "FACEBOOK", externalAccountId: pageId },
        select: { id: true },
      });

      if (exact) {
        await tx.socialAccount.update({
          where: { id: exact.id },
          data: { status: "connected", scopes: requiredScopes, updatedAt: now },
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
            data: { status: "connected", externalAccountId: pageId, scopes: requiredScopes, updatedAt: now },
          });
          socialAccountId = fallback.id;
        } else {
          const created = await tx.socialAccount.create({
            data: { tenantId: tenant.id, network: "FACEBOOK", status: "connected", externalAccountId: pageId, scopes: requiredScopes },
          });
          socialAccountId = created.id;
        }
      }

      const existingOAuth = await tx.oAuthConnection.findFirst({
        where: { tenantId: tenant.id, provider: "FACEBOOK" },
        select: { id: true },
      });

      if (existingOAuth) {
        await tx.oAuthConnection.update({
          where: { id: existingOAuth.id },
          data: {
            status: "connected",
            tokenRef: credentialId,
            socialAccountId,
            providerUserId: pageId,
            scopes: requiredScopes,
            connectedAt: now,
            updatedAt: now,
            expiresAt: null,
          },
        });
        connectionId = existingOAuth.id;
      } else {
        const created = await tx.oAuthConnection.create({
          data: {
            id: `oa_${tenant.id}_facebook`,
            tenantId: tenant.id,
            provider: "FACEBOOK",
            providerUserId: pageId,
            scopes: requiredScopes,
            status: "connected",
            tokenRef: credentialId,
            socialAccountId,
            connectedAt: now,
            updatedAt: now,
            expiresAt: null,
          },
        });
        connectionId = created.id;
      }
    });

    return NextResponse.json({
      ok: true,
      network: "FACEBOOK",
      tenantSlug,
      pageId,
      pageName: pageName ?? null,
      socialAccountId,
      credentialId: credentialId!,
      connectionId: connectionId!,
    });
  } catch (err) {
    const error = err as { name?: string; message?: string; code?: string; meta?: unknown };
    console.error("[facebook_bootstrap_save_failed]", {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
    });
    return NextResponse.json({
      ok: false,
      error: "Failed to save Facebook connection.",
      code: "FACEBOOK_CONNECTION_SAVE_FAILED",
    }, { status: 500 });
  }
}

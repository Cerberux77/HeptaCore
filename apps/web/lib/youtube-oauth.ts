import crypto from "node:crypto";
import type { OAuthProvider, UserRole } from "@prisma/client";
import { Permission } from "./permissions";
import { auditLog } from "./audit";
import { prisma } from "./prisma";
import { resolveTenantAccess } from "./tenant-access";
import { encryptJson, decryptJson } from "./token-vault";
import { resolvePublicOrigin } from "./url-origin";

const YOUTUBE_PROVIDER = "YOUTUBE" satisfies OAuthProvider;
const YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube.upload";
const YOUTUBE_PROFILE_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";
const OAUTH_SCOPES = [YOUTUBE_SCOPE, YOUTUBE_PROFILE_SCOPE, "openid"];
const STATE_COOKIE = "hc_oauth_youtube_state";
const STATE_TTL_MS = 10 * 60 * 1000;
const CONNECTION_LABEL = "youtube_oauth";

type OAuthStatePayload = {
  provider: "YOUTUBE";
  tenantId: string;
  tenantSlug: string;
  userId: string;
  nonce: string;
  returnTo: string;
  reconnect: boolean;
  exp: number;
};

type OAuthStateVerification =
  | { ok: true; payload: OAuthStatePayload }
  | { ok: false; code: string };

type ChannelIdentity = {
  channelId: string;
  title: string;
  handle: string | null;
  thumbnailUrl: string | null;
};

type DbClient = typeof prisma;

export type YoutubeConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnect_required"
  | "revoked"
  | "error"
  | "unavailable";

export type YoutubeConnectionStatus = {
  provider: "YOUTUBE";
  state: YoutubeConnectionState;
  channelTitle: string | null;
  channelId: string | null;
  handle: string | null;
  thumbnailUrl: string | null;
  connectedAt: string | null;
  expiresAt: string | null;
  scopes: string[];
};

type StartParams = {
  tenantSlug: string;
  userId: string;
  requestOrigin: string;
  requestUrl: string;
  requestedReturnTo?: string | null;
  reconnect?: boolean;
  db?: DbClient;
  auditFn?: typeof auditLog;
};

type CallbackParams = {
  code: string;
  stateParam: string;
  stateCookieValue?: string | null;
  requestOrigin: string;
  requestUrl: string;
  userId: string;
  db?: DbClient;
  fetchImpl?: typeof fetch;
  now?: number;
  auditFn?: typeof auditLog;
};

type DisconnectParams = {
  tenantSlug: string;
  userId: string;
  db?: DbClient;
  auditFn?: typeof auditLog;
};

function oauthSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.TOKEN_VAULT_SECRET ||
    "heptacore-dev"
  );
}

function signState(encodedPayload: string): string {
  return crypto.createHmac("sha256", oauthSecret()).update(encodedPayload).digest("base64url");
}

function createStateToken(payload: OAuthStatePayload): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encodedPayload}.${signState(encodedPayload)}`;
}

export function verifyStateToken(token: string, now = Date.now()): OAuthStateVerification {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return { ok: false, code: "INVALID_STATE_FORMAT" };
  }

  const expected = signState(encodedPayload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return { ok: false, code: "INVALID_STATE_SIGNATURE" };
  }

  let payload: OAuthStatePayload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as OAuthStatePayload;
  } catch {
    return { ok: false, code: "INVALID_STATE_PAYLOAD" };
  }

  if (
    payload.provider !== "YOUTUBE" ||
    !payload.tenantId ||
    !payload.tenantSlug ||
    !payload.userId ||
    !payload.nonce ||
    !payload.returnTo ||
    typeof payload.reconnect !== "boolean" ||
    typeof payload.exp !== "number"
  ) {
    return { ok: false, code: "INVALID_STATE_PAYLOAD" };
  }

  if (payload.exp <= now) {
    return { ok: false, code: "EXPIRED_STATE" };
  }

  return { ok: true, payload };
}

export function buildTenantReturnPath(tenantSlug: string, requestedReturnTo?: string | null): string {
  const fallback = `/tenant/${tenantSlug}?view=integrations`;
  if (!requestedReturnTo) return fallback;
  if (!requestedReturnTo.startsWith("/")) return fallback;

  try {
    const parsed = new URL(requestedReturnTo, "https://heptacore.local");
    if (parsed.origin !== "https://heptacore.local") return fallback;
    if (!parsed.pathname.startsWith(`/tenant/${tenantSlug}`)) return fallback;
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return fallback;
  }
}

function buildRedirectUri(requestOrigin: string): string {
  return `${resolvePublicOrigin(requestOrigin)}/api/oauth/youtube/callback`;
}

function buildAuthorizationUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
}) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", OAUTH_SCOPES.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", params.state);
  return url.toString();
}

async function requireTenantIntegrationAccess(
  db: DbClient,
  userId: string,
  tenantSlug: string,
): Promise<{ tenantId: string; tenantSlug: string; role: UserRole }> {
  const tenant = await db.tenant.findFirst({
    where: { slug: tenantSlug },
    select: { id: true, slug: true },
  });
  if (!tenant) {
    const error = new Error("Tenant not found");
    (error as Error & { status?: number }).status = 404;
    throw error;
  }

  const access = await resolveTenantAccess(userId, tenant.id, Permission.INTEGRATIONS_MANAGE, db);
  return { tenantId: tenant.id, tenantSlug: tenant.slug, role: access.role };
}

function normalizeScopes(scopeValue: string | null | undefined): string[] {
  return String(scopeValue || "")
    .split(/\s+/)
    .map((scope) => scope.trim())
    .filter(Boolean)
    .filter((scope, index, arr) => arr.indexOf(scope) === index);
}

async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
  fetchImpl: typeof fetch,
): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scopes: string[];
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    const error = new Error("Google OAuth credentials are not configured");
    (error as Error & { status?: number }).status = 500;
    throw error;
  }

  const response = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok || !payload || typeof payload.access_token !== "string") {
    const error = new Error("Google token exchange failed");
    (error as Error & { status?: number }).status = 502;
    throw error;
  }

  const expiresIn = typeof payload.expires_in === "number" ? payload.expires_in : null;
  return {
    accessToken: payload.access_token,
    refreshToken: typeof payload.refresh_token === "string" ? payload.refresh_token : null,
    expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
    scopes: normalizeScopes(typeof payload.scope === "string" ? payload.scope : undefined),
  };
}

async function discoverChannel(
  accessToken: string,
  fetchImpl: typeof fetch,
): Promise<ChannelIdentity> {
  const response = await fetchImpl(
    "https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  const payload = await response.json().catch(() => null) as
    | { items?: Array<Record<string, unknown>> }
    | null;
  const channel = payload?.items?.[0];

  if (!response.ok || !channel) {
    const error = new Error("YouTube channel discovery failed");
    (error as Error & { status?: number }).status = 502;
    throw error;
  }

  const snippet = (channel.snippet ?? {}) as Record<string, unknown>;
  const thumbnails = (snippet.thumbnails ?? {}) as Record<string, { url?: string }>;

  return {
    channelId: String(channel.id),
    title: typeof snippet.title === "string" ? snippet.title : "YouTube channel",
    handle: typeof snippet.customUrl === "string" ? snippet.customUrl : null,
    thumbnailUrl:
      thumbnails.default?.url ||
      thumbnails.medium?.url ||
      thumbnails.high?.url ||
      null,
  };
}

async function readExistingRefreshToken(db: DbClient, tenantId: string): Promise<string | null> {
  const connection = await db.oAuthConnection.findFirst({
    where: {
      tenantId,
      provider: YOUTUBE_PROVIDER,
      tokenRef: { not: null },
    },
    orderBy: { updatedAt: "desc" },
    select: { tokenRef: true },
  });

  if (!connection?.tokenRef) return null;

  const credential = await db.credentialVaultItem.findUnique({
    where: { id: connection.tokenRef },
    select: { encryptedBlob: true },
  });

  if (!credential?.encryptedBlob) return null;

  try {
    const decrypted = decryptJson<{ refresh_token?: string }>(credential.encryptedBlob);
    return typeof decrypted.refresh_token === "string" ? decrypted.refresh_token : null;
  } catch {
    return null;
  }
}

async function ensureTenantNetwork(db: DbClient, tenantId: string, tenantName: string) {
  const existingProfile = await db.brandProfile.findFirst({
    where: { tenantId },
    select: { id: true, socialChannels: true },
  });

  const channels = Array.isArray(existingProfile?.socialChannels)
    ? existingProfile.socialChannels.map((item) => String(item).toUpperCase())
    : [];

  if (channels.includes("YOUTUBE")) return;

  const nextChannels = [...channels, "YOUTUBE"];

  if (existingProfile) {
    await db.brandProfile.update({
      where: { id: existingProfile.id },
      data: { socialChannels: nextChannels, updatedAt: new Date() },
    });
    return;
  }

  await db.brandProfile.create({
    data: {
      id: `${tenantId}_brand_profile`,
      tenantId,
      brandName: tenantName,
      socialChannels: nextChannels,
      toneOfVoice: ["criterio tecnico", "confianza", "comunidad"],
      updatedAt: new Date(),
    },
  });
}

async function persistConnection(params: {
  db: DbClient;
  tenantId: string;
  tenantSlug: string;
  actorId: string;
  reconnect: boolean;
  channel: ChannelIdentity;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scopes: string[];
  auditFn?: typeof auditLog;
}) {
  const { db, tenantId, tenantSlug, actorId, reconnect, channel, accessToken, refreshToken, expiresAt, scopes } = params;
  const auditFn = params.auditFn || auditLog;
  const effectiveRefreshToken = refreshToken || await readExistingRefreshToken(db, tenantId);
  const now = new Date();

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });

  await db.$transaction(async (tx) => {
    const encryptedBlob = encryptJson({
      access_token: accessToken,
      refresh_token: effectiveRefreshToken,
      scope: scopes.join(" "),
      channel_id: channel.channelId,
      channel_title: channel.title,
      channel_handle: channel.handle,
      thumbnail_url: channel.thumbnailUrl,
      provider: "YOUTUBE",
      obtained_at: now.toISOString(),
    });

    const credential = await tx.credentialVaultItem.create({
      data: {
        tenantId,
        provider: "YOUTUBE",
        label: CONNECTION_LABEL,
        encryptedBlob: new Uint8Array(encryptedBlob),
        keyVersion: "v1",
        expiresAt,
      },
    });

    const exactAccount = await tx.socialAccount.findFirst({
      where: {
        tenantId,
        network: "YOUTUBE",
        externalAccountId: channel.channelId,
      },
      select: { id: true },
    });

    const fallbackAccount = exactAccount
      ? null
      : await tx.socialAccount.findFirst({
          where: {
            tenantId,
            network: "YOUTUBE",
          },
          orderBy: { updatedAt: "desc" },
          select: { id: true },
        });

    const socialAccount = exactAccount
      ? await tx.socialAccount.update({
          where: { id: exactAccount.id },
          data: {
            handle: channel.handle || channel.title,
            externalAccountId: channel.channelId,
            status: "connected",
            scopes,
            updatedAt: now,
          },
        })
      : fallbackAccount
        ? await tx.socialAccount.update({
            where: { id: fallbackAccount.id },
            data: {
              handle: channel.handle || channel.title,
              externalAccountId: channel.channelId,
              status: "connected",
              scopes,
              updatedAt: now,
            },
          })
        : await tx.socialAccount.create({
            data: {
              tenantId,
              network: "YOUTUBE",
              handle: channel.handle || channel.title,
              externalAccountId: channel.channelId,
              status: "connected",
              scopes,
            },
          });

    const connectionId = `oa_${tenantId}_youtube`;
    const existingConnection = await tx.oAuthConnection.findUnique({
      where: { id: connectionId },
      select: { id: true },
    });

    if (existingConnection) {
      await tx.oAuthConnection.update({
        where: { id: connectionId },
        data: {
          providerUserId: channel.channelId,
          scopes,
          status: "connected",
          tokenRef: credential.id,
          expiresAt,
          socialAccountId: socialAccount.id,
          connectedAt: now,
          updatedAt: now,
        },
      });
    } else {
      await tx.oAuthConnection.create({
        data: {
          id: connectionId,
          tenantId,
          provider: "YOUTUBE",
          providerUserId: channel.channelId,
          scopes,
          status: "connected",
          tokenRef: credential.id,
          expiresAt,
          socialAccountId: socialAccount.id,
          connectedAt: now,
          updatedAt: now,
        },
      });
    }

    await ensureTenantNetwork(tx as DbClient, tenantId, tenant?.name || tenantSlug);
  });

  await auditFn({
    tenantId,
    actorId,
    action: reconnect ? "youtube_oauth_reconnected" : "youtube_oauth_connected",
    target: `youtube:${channel.channelId}`,
    metadata: {
      channelId: channel.channelId,
      channelTitle: channel.title,
      channelHandle: channel.handle,
      scopes,
      expiresAt: expiresAt?.toISOString() ?? null,
    },
  });
}

export async function startYoutubeOAuth(params: StartParams) {
  const db = params.db || prisma;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    const error = new Error("Google OAuth is not configured");
    (error as Error & { status?: number }).status = 500;
    throw error;
  }

  const access = await requireTenantIntegrationAccess(db, params.userId, params.tenantSlug);
  const redirectUri = buildRedirectUri(params.requestOrigin);
  const returnTo = buildTenantReturnPath(access.tenantSlug, params.requestedReturnTo);

  const state = createStateToken({
    provider: "YOUTUBE",
    tenantId: access.tenantId,
    tenantSlug: access.tenantSlug,
    userId: params.userId,
    nonce: crypto.randomBytes(16).toString("hex"),
    returnTo,
    reconnect: Boolean(params.reconnect),
    exp: Date.now() + STATE_TTL_MS,
  });

  return {
    authorizationUrl: buildAuthorizationUrl({ clientId, redirectUri, state }),
    state,
    cookieName: STATE_COOKIE,
    redirectUri,
    returnTo,
  };
}

export async function completeYoutubeOAuth(params: CallbackParams) {
  const db = params.db || prisma;
  const fetchImpl = params.fetchImpl || fetch;
  const now = params.now ?? Date.now();
  const verification = verifyStateToken(params.stateParam, now);
  if (!verification.ok) {
    const error = new Error(verification.code);
    (error as Error & { status?: number }).status = 400;
    throw error;
  }

  if (!params.stateCookieValue || params.stateCookieValue !== params.stateParam) {
    const error = new Error("STATE_REPLAY_REJECTED");
    (error as Error & { status?: number }).status = 400;
    throw error;
  }

  const state = verification.payload;
  if (state.userId !== params.userId) {
    const error = new Error("STATE_USER_MISMATCH");
    (error as Error & { status?: number }).status = 403;
    throw error;
  }

  await resolveTenantAccess(params.userId, state.tenantId, Permission.INTEGRATIONS_MANAGE, db);

  const redirectUri = buildRedirectUri(params.requestOrigin);
  const token = await exchangeCodeForToken(params.code, redirectUri, fetchImpl);
  const channel = await discoverChannel(token.accessToken, fetchImpl);

  await persistConnection({
    db,
    tenantId: state.tenantId,
    tenantSlug: state.tenantSlug,
    actorId: params.userId,
    reconnect: state.reconnect,
    channel,
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    expiresAt: token.expiresAt,
    scopes: token.scopes.length > 0 ? token.scopes : OAUTH_SCOPES,
    auditFn: params.auditFn,
  });

  return {
    returnTo: `${state.returnTo}${state.returnTo.includes("?") ? "&" : "?"}oauth=${state.reconnect ? "youtube_reconnected" : "youtube_connected"}`,
    tenantSlug: state.tenantSlug,
  };
}

function mapStatus(params: {
  connection: {
    status: string;
    scopes: string[];
    connectedAt: Date | null;
    expiresAt: Date | null;
    tokenRef: string | null;
  } | null;
  socialAccount: {
    externalAccountId: string | null;
    handle: string | null;
    status: string;
  } | null;
  credentialMeta: {
    channelTitle?: string;
    channelHandle?: string | null;
    thumbnailUrl?: string | null;
    refreshToken?: string | null;
  } | null;
}): YoutubeConnectionStatus {
  const { connection, socialAccount, credentialMeta } = params;
  if (!connection || !socialAccount) {
    return {
      provider: "YOUTUBE",
      state: "disconnected",
      channelTitle: null,
      channelId: null,
      handle: null,
      thumbnailUrl: null,
      connectedAt: null,
      expiresAt: null,
      scopes: [],
    };
  }

  if (connection.status === "revoked") {
    return {
      provider: "YOUTUBE",
      state: "revoked",
      channelTitle: credentialMeta?.channelTitle || socialAccount.handle,
      channelId: socialAccount.externalAccountId,
      handle: credentialMeta?.channelHandle || socialAccount.handle,
      thumbnailUrl: credentialMeta?.thumbnailUrl || null,
      connectedAt: connection.connectedAt?.toISOString() ?? null,
      expiresAt: connection.expiresAt?.toISOString() ?? null,
      scopes: connection.scopes,
    };
  }

  const expired = Boolean(connection.expiresAt && connection.expiresAt.getTime() <= Date.now());
  const reconnectRequired = expired && !credentialMeta?.refreshToken;

  return {
    provider: "YOUTUBE",
    state: reconnectRequired ? "reconnect_required" : connection.status === "connected" ? "connected" : "error",
    channelTitle: credentialMeta?.channelTitle || socialAccount.handle,
    channelId: socialAccount.externalAccountId,
    handle: credentialMeta?.channelHandle || socialAccount.handle,
    thumbnailUrl: credentialMeta?.thumbnailUrl || null,
    connectedAt: connection.connectedAt?.toISOString() ?? null,
    expiresAt: connection.expiresAt?.toISOString() ?? null,
    scopes: connection.scopes,
  };
}

export async function getYoutubeConnectionStatus(params: {
  tenantSlug: string;
  userId: string;
  db?: DbClient;
}): Promise<YoutubeConnectionStatus> {
  const db = params.db || prisma;
  const access = await requireTenantIntegrationAccess(db, params.userId, params.tenantSlug);

  const connection = await db.oAuthConnection.findFirst({
    where: {
      tenantId: access.tenantId,
      provider: YOUTUBE_PROVIDER,
    },
    orderBy: { updatedAt: "desc" },
    select: {
      status: true,
      scopes: true,
      connectedAt: true,
      expiresAt: true,
      tokenRef: true,
      socialAccountId: true,
    },
  });

  if (!connection?.socialAccountId) {
    return mapStatus({ connection: null, socialAccount: null, credentialMeta: null });
  }

  const [socialAccount, credential] = await Promise.all([
    db.socialAccount.findUnique({
      where: { id: connection.socialAccountId },
      select: {
        externalAccountId: true,
        handle: true,
        status: true,
      },
    }),
    connection.tokenRef
      ? db.credentialVaultItem.findUnique({
          where: { id: connection.tokenRef },
          select: { encryptedBlob: true },
        })
      : Promise.resolve(null),
  ]);

  let credentialMeta: {
    channelTitle?: string;
    channelHandle?: string | null;
    thumbnailUrl?: string | null;
    refreshToken?: string | null;
  } | null = null;

  if (credential?.encryptedBlob) {
    try {
      const decrypted = decryptJson<{
        channel_title?: string;
        channel_handle?: string | null;
        thumbnail_url?: string | null;
        refresh_token?: string | null;
      }>(credential.encryptedBlob);
      credentialMeta = {
        channelTitle: decrypted.channel_title,
        channelHandle: decrypted.channel_handle ?? null,
        thumbnailUrl: decrypted.thumbnail_url ?? null,
        refreshToken: decrypted.refresh_token ?? null,
      };
    } catch {
      credentialMeta = null;
    }
  }

  return mapStatus({ connection, socialAccount, credentialMeta });
}

export async function disconnectYoutubeOAuth(params: DisconnectParams) {
  const db = params.db || prisma;
  const auditFn = params.auditFn || auditLog;
  const access = await requireTenantIntegrationAccess(db, params.userId, params.tenantSlug);

  const connection = await db.oAuthConnection.findFirst({
    where: {
      tenantId: access.tenantId,
      provider: YOUTUBE_PROVIDER,
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, socialAccountId: true },
  });

  if (!connection) {
    return { ok: true };
  }

  await db.$transaction(async (tx) => {
    await tx.oAuthConnection.update({
      where: { id: connection.id },
      data: {
        status: "revoked",
        updatedAt: new Date(),
      },
    });

    if (connection.socialAccountId) {
      await tx.socialAccount.update({
        where: { id: connection.socialAccountId },
        data: {
          status: "disconnected",
          updatedAt: new Date(),
        },
      });
    }
  });

  await auditFn({
    tenantId: access.tenantId,
    actorId: params.userId,
    action: "youtube_oauth_disconnected",
    target: `tenant:${access.tenantId}`,
  });

  return { ok: true };
}

export const youtubeOAuthConfig = {
  cookieName: STATE_COOKIE,
  scopes: OAUTH_SCOPES,
  provider: YOUTUBE_PROVIDER,
  credentialLabel: CONNECTION_LABEL,
};

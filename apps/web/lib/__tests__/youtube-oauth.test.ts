import assert from "node:assert/strict";
import test from "node:test";
import { decryptJson, encryptJson } from "../token-vault";
import {
  buildTenantReturnPath,
  completeYoutubeOAuth,
  disconnectYoutubeOAuth,
  getYoutubeConnectionStatus,
  startYoutubeOAuth,
  verifyStateToken,
  youtubeOAuthConfig,
} from "../youtube-oauth";

process.env.TOKEN_VAULT_SECRET = process.env.TOKEN_VAULT_SECRET || "0123456789abcdef0123456789abcdef";

type Store = ReturnType<typeof createStore>;

function createStore() {
  return {
    tenant: { id: "tenant-1", slug: "acme", name: "Acme", status: "ACTIVE" },
    user: { id: "user-1" },
    memberships: [{ userId: "user-1", tenantId: "tenant-1", role: "ADMIN" }],
    brandProfile: null as null | { id: string; socialChannels: string[] },
    socialAccounts: [] as Array<Record<string, any>>,
    oauthConnections: [] as Array<Record<string, any>>,
    credentials: [] as Array<Record<string, any>>,
  };
}

function createDb(store: Store) {
  return {
    user: {
      findUnique: async ({ where }: any) => where.id === store.user.id ? { id: store.user.id } : null,
    },
    membership: {
      findUnique: async ({ where }: any) => {
        const found = store.memberships.find((item) =>
          item.userId === where.tenantId_userId.userId && item.tenantId === where.tenantId_userId.tenantId,
        );
        return found ? { role: found.role } : null;
      },
      findMany: async ({ where }: any) =>
        store.memberships
          .filter((item) => item.userId === where.userId)
          .map((item) => ({ role: item.role })),
    },
    tenant: {
      findFirst: async ({ where }: any) => where.slug === store.tenant.slug ? { id: store.tenant.id, slug: store.tenant.slug } : null,
      findUnique: async ({ where, select }: any) => {
        if (where.id !== store.tenant.id) return null;
        if (select?.name) return { name: store.tenant.name };
        if (select?.id && select?.status) return { id: store.tenant.id, status: store.tenant.status };
        if (select?.status) return { status: store.tenant.status };
        return { id: store.tenant.id, slug: store.tenant.slug, name: store.tenant.name, status: store.tenant.status };
      },
    },
    brandProfile: {
      findFirst: async () => store.brandProfile,
      update: async ({ data }: any) => {
        store.brandProfile = { ...(store.brandProfile || { id: "bp-1", socialChannels: [] }), ...data };
        return store.brandProfile;
      },
      create: async ({ data }: any) => {
        store.brandProfile = { id: data.id, socialChannels: data.socialChannels };
        return store.brandProfile;
      },
    },
    socialAccount: {
      findFirst: async ({ where }: any) => {
        let items = store.socialAccounts.filter((item) => item.tenantId === where.tenantId && item.network === where.network);
        if (where.externalAccountId !== undefined) {
          items = items.filter((item) => item.externalAccountId === where.externalAccountId);
        }
        if (where.status) items = items.filter((item) => item.status === where.status);
        return items[0] || null;
      },
      findUnique: async ({ where }: any) => store.socialAccounts.find((item) => item.id === where.id) || null,
      create: async ({ data }: any) => {
        const created = { id: `sa-${store.socialAccounts.length + 1}`, createdAt: new Date(), updatedAt: new Date(), ...data };
        store.socialAccounts.push(created);
        return created;
      },
      update: async ({ where, data }: any) => {
        const item = store.socialAccounts.find((entry) => entry.id === where.id);
        assert.ok(item);
        Object.assign(item, data);
        return item;
      },
    },
    oAuthConnection: {
      findFirst: async ({ where }: any) => {
        const items = store.oauthConnections
          .filter((item) => item.tenantId === where.tenantId && item.provider === where.provider)
          .filter((item) => where.tokenRef?.not === null ? item.tokenRef !== null : true)
          .sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt));
        return items[0] || null;
      },
      findUnique: async ({ where }: any) => store.oauthConnections.find((item) => item.id === where.id) || null,
      create: async ({ data }: any) => {
        const created = { ...data };
        store.oauthConnections.push(created);
        return created;
      },
      update: async ({ where, data }: any) => {
        const item = store.oauthConnections.find((entry) => entry.id === where.id);
        assert.ok(item);
        Object.assign(item, data);
        return item;
      },
    },
    credentialVaultItem: {
      create: async ({ data }: any) => {
        const created = { id: `cred-${store.credentials.length + 1}`, ...data };
        store.credentials.push(created);
        return created;
      },
      findUnique: async ({ where }: any) => store.credentials.find((item) => item.id === where.id) || null,
    },
    $transaction: async (callback: (db: any) => Promise<unknown>) => callback(createDb(store)),
  } as any;
}

test("buildTenantReturnPath keeps only tenant-local return URLs", () => {
  assert.equal(buildTenantReturnPath("acme", "/tenant/acme?view=integrations"), "/tenant/acme?view=integrations");
  assert.equal(buildTenantReturnPath("acme", "https://evil.test/tenant/acme"), "/tenant/acme?view=integrations");
  assert.equal(buildTenantReturnPath("acme", "/tenant/other"), "/tenant/acme?view=integrations");
});

test("startYoutubeOAuth builds a signed Google authorization URL", async () => {
  const store = createStore();
  const db = createDb(store);
  process.env.GOOGLE_CLIENT_ID = "google-client";

  const result = await startYoutubeOAuth({
    tenantSlug: "acme",
    userId: "user-1",
    requestOrigin: "https://app.example.test",
    requestUrl: "https://app.example.test/api/tenants/acme/oauth/youtube/connect",
    requestedReturnTo: "/tenant/acme?view=integrations",
    db,
  });

  const url = new URL(result.authorizationUrl);
  assert.equal(url.origin, "https://accounts.google.com");
  assert.equal(url.searchParams.get("access_type"), "offline");
  assert.equal(url.searchParams.get("redirect_uri"), "https://app.example.test/api/oauth/youtube/callback");
  assert.equal(url.searchParams.get("scope")?.includes("youtube.upload"), true);
  assert.equal(result.cookieName, youtubeOAuthConfig.cookieName);

  const verified = verifyStateToken(result.state);
  assert.equal(verified.ok, true);
});

test("verifyStateToken rejects tampered and expired state", async () => {
  const store = createStore();
  const db = createDb(store);
  process.env.GOOGLE_CLIENT_ID = "google-client";

  const result = await startYoutubeOAuth({
    tenantSlug: "acme",
    userId: "user-1",
    requestOrigin: "https://app.example.test",
    requestUrl: "https://app.example.test/api/tenants/acme/oauth/youtube/connect",
    db,
  });

  assert.equal(verifyStateToken(`${result.state}x`).ok, false);
  assert.equal(verifyStateToken(result.state, Date.now() + 11 * 60 * 1000).ok, false);
});

test("completeYoutubeOAuth persists encrypted tenant-scoped credentials and social account", async () => {
  const store = createStore();
  const db = createDb(store);
  const auditEvents: string[] = [];
  process.env.GOOGLE_CLIENT_ID = "google-client";
  process.env.GOOGLE_CLIENT_SECRET = "google-secret";

  const start = await startYoutubeOAuth({
    tenantSlug: "acme",
    userId: "user-1",
    requestOrigin: "https://app.example.test",
    requestUrl: "https://app.example.test/api/tenants/acme/oauth/youtube/connect",
    db,
  });

  const result = await completeYoutubeOAuth({
    code: "auth-code",
    stateParam: start.state,
    stateCookieValue: start.state,
    requestOrigin: "https://app.example.test",
    requestUrl: "https://app.example.test/api/oauth/youtube/callback",
    userId: "user-1",
    db,
    auditFn: async ({ action }) => {
      auditEvents.push(action);
    },
    fetchImpl: async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "https://oauth2.googleapis.com/token") {
        return Response.json({
          access_token: "access-1",
          refresh_token: "refresh-1",
          expires_in: 3600,
          scope: "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
        });
      }
      if (url.startsWith("https://www.googleapis.com/youtube/v3/channels")) {
        return Response.json({
          items: [{
            id: "channel-1",
            snippet: {
              title: "Acme TV",
              customUrl: "@acme",
              thumbnails: { default: { url: "https://img.example.test/channel-1.jpg" } },
            },
          }],
        });
      }
      throw new Error(`Unexpected URL ${url}`);
    },
  });

  assert.match(result.returnTo, /oauth=youtube_connected/);
  assert.equal(store.socialAccounts.length, 1);
  assert.equal(store.oauthConnections.length, 1);
  assert.equal(store.credentials.length, 1);
  assert.equal(store.oauthConnections[0].provider, "YOUTUBE");
  assert.equal(store.credentials[0].label, "youtube_oauth");
  assert.deepEqual(auditEvents, ["youtube_oauth_connected"]);

  const decrypted = decryptJson<any>(store.credentials[0].encryptedBlob);
  assert.equal(decrypted.access_token, "access-1");
  assert.equal(decrypted.refresh_token, "refresh-1");
  assert.equal(decrypted.channel_id, "channel-1");
});

test("completeYoutubeOAuth rejects callback replay when cookie and state diverge", async () => {
  const store = createStore();
  const db = createDb(store);
  process.env.GOOGLE_CLIENT_ID = "google-client";
  process.env.GOOGLE_CLIENT_SECRET = "google-secret";

  const start = await startYoutubeOAuth({
    tenantSlug: "acme",
    userId: "user-1",
    requestOrigin: "https://app.example.test",
    requestUrl: "https://app.example.test/api/tenants/acme/oauth/youtube/connect",
    db,
  });

  await assert.rejects(
    () => completeYoutubeOAuth({
      code: "auth-code",
      stateParam: start.state,
      stateCookieValue: "different",
      requestOrigin: "https://app.example.test",
      requestUrl: "https://app.example.test/api/oauth/youtube/callback",
      userId: "user-1",
      db,
      fetchImpl: async () => Response.json({}),
    }),
    /STATE_REPLAY_REJECTED/,
  );
});

test("completeYoutubeOAuth preserves existing refresh token when reconnect omits it", async () => {
  const store = createStore();
  const db = createDb(store);
  store.socialAccounts.push({
    id: "sa-1",
    tenantId: "tenant-1",
    network: "YOUTUBE",
    status: "connected",
    scopes: [],
    externalAccountId: "channel-1",
    handle: "@acme",
    updatedAt: new Date(),
  });
  store.credentials.push({
    id: "cred-existing",
    tenantId: "tenant-1",
    provider: "YOUTUBE",
    label: "youtube_oauth",
    encryptedBlob: new Uint8Array(encryptJson({ access_token: "old-access", refresh_token: "kept-refresh" })),
    expiresAt: new Date(Date.now() - 1000),
  });
  store.oauthConnections.push({
    id: "oa_tenant-1_youtube",
    tenantId: "tenant-1",
    provider: "YOUTUBE",
    providerUserId: "channel-1",
    scopes: [],
    status: "connected",
    tokenRef: "cred-existing",
    expiresAt: new Date(Date.now() - 1000),
    socialAccountId: "sa-1",
    connectedAt: new Date(),
    updatedAt: new Date(),
  });

  process.env.GOOGLE_CLIENT_ID = "google-client";
  process.env.GOOGLE_CLIENT_SECRET = "google-secret";

  const start = await startYoutubeOAuth({
    tenantSlug: "acme",
    userId: "user-1",
    requestOrigin: "https://app.example.test",
    requestUrl: "https://app.example.test/api/tenants/acme/oauth/youtube/reconnect",
    db,
    reconnect: true,
  });

  await completeYoutubeOAuth({
    code: "auth-code",
    stateParam: start.state,
    stateCookieValue: start.state,
    requestOrigin: "https://app.example.test",
    requestUrl: "https://app.example.test/api/oauth/youtube/callback",
    userId: "user-1",
    db,
    auditFn: async () => undefined,
    fetchImpl: async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "https://oauth2.googleapis.com/token") {
        return Response.json({
          access_token: "access-2",
          expires_in: 3600,
          scope: "https://www.googleapis.com/auth/youtube.upload",
        });
      }
      return Response.json({
        items: [{
          id: "channel-1",
          snippet: { title: "Acme TV", customUrl: "@acme", thumbnails: {} },
        }],
      });
    },
  });

  const latest = store.credentials[store.credentials.length - 1];
  const decrypted = decryptJson<any>(latest.encryptedBlob);
  assert.equal(decrypted.refresh_token, "kept-refresh");
});

test("getYoutubeConnectionStatus reports reconnect_required when token expired and no refresh token exists", async () => {
  const store = createStore();
  const db = createDb(store);
  store.socialAccounts.push({
    id: "sa-1",
    tenantId: "tenant-1",
    network: "YOUTUBE",
    status: "connected",
    scopes: [youtubeOAuthConfig.scopes[0]],
    externalAccountId: "channel-1",
    handle: "@acme",
    updatedAt: new Date(),
  });
  store.credentials.push({
    id: "cred-1",
    tenantId: "tenant-1",
    provider: "YOUTUBE",
    label: "youtube_oauth",
    encryptedBlob: new Uint8Array(encryptJson({ access_token: "access-1", channel_title: "Acme TV" })),
    expiresAt: new Date(Date.now() - 1000),
  });
  store.oauthConnections.push({
    id: "oa_tenant-1_youtube",
    tenantId: "tenant-1",
    provider: "YOUTUBE",
    providerUserId: "channel-1",
    scopes: [youtubeOAuthConfig.scopes[0]],
    status: "connected",
    tokenRef: "cred-1",
    expiresAt: new Date(Date.now() - 1000),
    socialAccountId: "sa-1",
    connectedAt: new Date(),
    updatedAt: new Date(),
  });

  const status = await getYoutubeConnectionStatus({
    tenantSlug: "acme",
    userId: "user-1",
    db,
  });

  assert.equal(status.state, "reconnect_required");
  assert.equal("accessToken" in (status as Record<string, unknown>), false);
});

test("disconnectYoutubeOAuth revokes the connection and disconnects the tenant social account", async () => {
  const store = createStore();
  const db = createDb(store);
  const auditEvents: string[] = [];
  store.socialAccounts.push({
    id: "sa-1",
    tenantId: "tenant-1",
    network: "YOUTUBE",
    status: "connected",
    scopes: [],
    externalAccountId: "channel-1",
    handle: "@acme",
    updatedAt: new Date(),
  });
  store.oauthConnections.push({
    id: "oa_tenant-1_youtube",
    tenantId: "tenant-1",
    provider: "YOUTUBE",
    providerUserId: "channel-1",
    scopes: [],
    status: "connected",
    tokenRef: "cred-1",
    expiresAt: new Date(),
    socialAccountId: "sa-1",
    connectedAt: new Date(),
    updatedAt: new Date(),
  });

  await disconnectYoutubeOAuth({
    tenantSlug: "acme",
    userId: "user-1",
    db,
    auditFn: async ({ action }) => {
      auditEvents.push(action);
    },
  });

  assert.equal(store.oauthConnections[0].status, "revoked");
  assert.equal(store.socialAccounts[0].status, "disconnected");
  assert.deepEqual(auditEvents, ["youtube_oauth_disconnected"]);
});

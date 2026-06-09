import { createCipheriv, randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const tenantSlug = "turpial-sound";
const provider = "FACEBOOK";
const network = "FACEBOOK";
const credentialProvider = "facebook";
const keyVersion = "enc:v1:aes-256-gcm";
const algorithm = "aes-256-gcm";
const encryptionKeyBytes = 32;
const facebookScopes = ["pages_show_list", "pages_read_engagement", "pages_manage_posts"];

function loadEnvFile(path) {
  if (!existsSync(path)) return false;

  const content = readFileSync(path, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const separator = trimmed.indexOf("=");
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    value = value.replace(/^['"]|['"]$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  return true;
}

function normalizeEncryptionKey(value) {
  return value.trim().replace(/^['"]|['"]$/g, "").replace(/\s+/g, "");
}

function decodeEncryptionKey(value) {
  if (!value) return null;

  const normalized = normalizeEncryptionKey(value);
  if (!normalized) return null;

  const base64 = normalized.replace(/-/g, "+").replace(/_/g, "/");
  const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(paddedBase64)) {
    return null;
  }

  return Buffer.from(paddedBase64, "base64");
}

function getEncryptionKey() {
  const key = decodeEncryptionKey(process.env.ENCRYPTION_KEY);

  if (!key || key.length !== encryptionKeyBytes) {
    throw new Error("ENCRYPTION_KEY must decode to 32 bytes.");
  }

  return key;
}

function sealTokenEnvelope({ pageId, accessToken }) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, getEncryptionKey(), iv);
  const plaintext = Buffer.from(JSON.stringify({
    provider,
    accessToken,
    providerUserId: pageId,
    scopes: facebookScopes
  }), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.from(JSON.stringify({
    version: 1,
    algorithm,
    keyVersion,
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    ciphertext: ciphertext.toString("base64")
  }), "utf8");
}

function fail(message) {
  console.error(JSON.stringify({ ok: false, error: message }, null, 2));
  process.exit(1);
}

const envLoaded = loadEnvFile(resolve(process.cwd(), ".env.rrss"));
const pageIdEnv = process.env.FACEBOOK_PAGE_ID ? "FACEBOOK_PAGE_ID" : "META_PAGE_ID";
const tokenEnv = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  ? "FACEBOOK_PAGE_ACCESS_TOKEN"
  : "META_ACCESS_TOKEN";
const pageId = process.env.FACEBOOK_PAGE_ID || process.env.META_PAGE_ID;
const pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN;
const datasourceUrl = process.env.DATABASE_URL;
const encryptionKey = decodeEncryptionKey(process.env.ENCRYPTION_KEY);

if (!envLoaded) fail(".env.rrss was not found.");
if (!datasourceUrl) fail("DATABASE_URL is required.");
if (!pageId) fail("FACEBOOK_PAGE_ID or META_PAGE_ID is required.");
if (!pageAccessToken) fail("FACEBOOK_PAGE_ACCESS_TOKEN or META_ACCESS_TOKEN is required.");
if (!process.env.ENCRYPTION_KEY) fail("ENCRYPTION_KEY is required.");
if (!encryptionKey || encryptionKey.length !== encryptionKeyBytes) {
  fail("ENCRYPTION_KEY must decode to 32 bytes.");
}

const adapter = new PrismaPg({ connectionString: datasourceUrl });
const prisma = new PrismaClient({ adapter });

try {
  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.findUnique({
      where: { slug: tenantSlug }
    });

    if (!tenant) {
      throw new Error("tenant_not_found");
    }

    const encryptedBlob = sealTokenEnvelope({ pageId, accessToken: pageAccessToken });
    const existingSocialAccount = await tx.socialAccount.findFirst({
      where: {
        tenantId: tenant.id,
        network,
        externalAccountId: pageId
      }
    });

    const socialAccount = existingSocialAccount
      ? await tx.socialAccount.update({
          where: { id: existingSocialAccount.id },
          data: {
            status: "connected",
            scopes: facebookScopes
          }
        })
      : await tx.socialAccount.create({
          data: {
            tenantId: tenant.id,
            network,
            externalAccountId: pageId,
            status: "connected",
            scopes: facebookScopes
          }
        });

    const existingConnection = await tx.oAuthConnection.findFirst({
      where: {
        tenantId: tenant.id,
        provider,
        providerUserId: pageId
      }
    });

    let credential = null;
    if (existingConnection?.tokenRef) {
      credential = await tx.oAuthCredential.findUnique({
        where: { id: existingConnection.tokenRef }
      });
    }

    credential = credential
      ? await tx.oAuthCredential.update({
          where: { id: credential.id },
          data: {
            socialAccountId: socialAccount.id,
            encryptedBlob,
            keyVersion,
            expiresAt: null,
            rotatedAt: new Date()
          }
        })
      : await tx.oAuthCredential.create({
          data: {
            tenantId: tenant.id,
            socialAccountId: socialAccount.id,
            provider: credentialProvider,
            label: `${credentialProvider}:${pageId}`,
            encryptedBlob,
            keyVersion,
            expiresAt: null
          }
        });

    const connection = existingConnection
      ? await tx.oAuthConnection.update({
          where: { id: existingConnection.id },
          data: {
            socialAccountId: socialAccount.id,
            scopes: facebookScopes,
            status: "connected",
            tokenRef: credential.id,
            expiresAt: null,
            connectedAt: new Date()
          }
        })
      : await tx.oAuthConnection.create({
          data: {
            tenantId: tenant.id,
            socialAccountId: socialAccount.id,
            provider,
            providerUserId: pageId,
            scopes: facebookScopes,
            status: "connected",
            tokenRef: credential.id,
            expiresAt: null,
            connectedAt: new Date()
          }
        });

    return {
      socialAccountId: socialAccount.id,
      connectionId: connection.id,
      credentialId: credential.id,
      encryptedBlobPresent: Boolean(credential.encryptedBlob?.byteLength),
      status: connection.status
    };
  });

  console.log(JSON.stringify({
    ok: true,
    tenantSlug,
    provider: credentialProvider,
    network,
    pageId,
    envVarsUsed: [pageIdEnv, tokenEnv, "DATABASE_URL", "ENCRYPTION_KEY"],
    ...result
  }, null, 2));
} catch (error) {
  const message = error instanceof Error ? error.message : "facebook_vault_seed_failed";
  console.error(JSON.stringify({
    ok: false,
    tenantSlug,
    provider: credentialProvider,
    network,
    pageIdPresent: Boolean(pageId),
    error: message
  }, null, 2));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

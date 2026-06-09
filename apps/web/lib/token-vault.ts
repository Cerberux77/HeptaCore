import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const algorithm = "aes-256-gcm";
const keyVersion = "enc:v1:aes-256-gcm";
const instagramScopes = [
  "instagram_business_basic",
  "instagram_business_content_publish"
];
const encryptionKeyBytes = 32;

type VaultPrismaClient = InstanceType<typeof PrismaClient>;
type VaultTransactionClient = Omit<
  VaultPrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

declare global {
  // eslint-disable-next-line no-var
  var heptacoreVaultPrisma: VaultPrismaClient | undefined;
}

export type TokenEnvelope = {
  provider: "FACEBOOK" | "INSTAGRAM" | "WHATSAPP";
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  providerUserId?: string;
  expiresAt?: string | null;
  scopes?: string[];
};

export type VaultStorageInput = {
  tenantSlug: string;
  provider: "INSTAGRAM";
  providerUserId: string;
  accessToken: string;
  tokenType?: string;
  expiresIn?: number | null;
  scopes?: string[];
};

export type VaultStorageResult = {
  tokenStored: boolean;
  storageBlockedBy?: string;
  storageErrorName?: string;
  storageErrorCode?: string | null;
  storageErrorMessage?: string;
  storageStep?: string;
  tenantResolved?: boolean;
  tenantIdPresent?: boolean;
  providerAccountIdPresent?: boolean;
  modelsUsed?: string[];
  tenantSlug?: string;
  provider?: "instagram";
  providerUserId?: string;
  expiresAt?: string | null;
  vaultAdapter: "implemented";
  encryptionKeyPresent: boolean;
  encryptionKeyValidLength: boolean;
};

type SealedTokenEnvelope = {
  version: 1;
  algorithm: typeof algorithm;
  keyVersion: typeof keyVersion;
  iv: string;
  authTag: string;
  ciphertext: string;
};

type VaultStorageDiagnostics = {
  storageStep: string;
  tenantResolved: boolean;
  tenantIdPresent: boolean;
  providerAccountIdPresent: boolean;
  modelsUsed: string[];
};

type SafePrismaError = {
  storageErrorName: string;
  storageErrorCode: string | null;
  storageErrorMessage: string;
};

function normalizeEncryptionKey(value: string) {
  return value.trim().replace(/^['"]|['"]$/g, "").replace(/\s+/g, "");
}

function decodeEncryptionKey(value: string | undefined) {
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

function getSafePrismaError(error: unknown): SafePrismaError {
  const record = error as {
    name?: unknown;
    code?: unknown;
    message?: unknown;
  };

  return {
    storageErrorName: typeof record.name === "string" ? record.name : "Error",
    storageErrorCode: typeof record.code === "string" ? record.code : null,
    storageErrorMessage: typeof record.message === "string"
      ? record.message.split("\n").map((line) => line.trim()).filter(Boolean).slice(-1)[0] ?? "vault_storage_failed"
      : "vault_storage_failed"
  };
}

export function getEncryptionKeyStatus() {
  const value = process.env.ENCRYPTION_KEY;
  const key = decodeEncryptionKey(value);

  if (!value) {
    return {
      encryptionKeyPresent: false,
      encryptionKeyValidLength: false
    };
  }

  return {
    encryptionKeyPresent: true,
    encryptionKeyValidLength: key?.length === encryptionKeyBytes
  };
}

export function canPersistEncryptedTokens() {
  const status = getEncryptionKeyStatus();
  return status.encryptionKeyPresent && status.encryptionKeyValidLength;
}

function getEncryptionKey() {
  const key = decodeEncryptionKey(process.env.ENCRYPTION_KEY);

  if (!key || key.length !== encryptionKeyBytes) {
    throw new Error("ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  }

  return key;
}

function getPrisma() {
  if (globalThis.heptacoreVaultPrisma) {
    return globalThis.heptacoreVaultPrisma;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for OAuth token vault storage.");
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== "production") {
    globalThis.heptacoreVaultPrisma = prisma;
  }

  return prisma;
}

export async function sealTokenEnvelope(envelope: TokenEnvelope) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, getEncryptionKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(envelope), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const sealed: SealedTokenEnvelope = {
    version: 1,
    algorithm,
    keyVersion,
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    ciphertext: ciphertext.toString("base64")
  };

  return Buffer.from(JSON.stringify(sealed), "utf8");
}

export async function openTokenEnvelope(encryptedBlob: Uint8Array) {
  const sealed = JSON.parse(Buffer.from(encryptedBlob).toString("utf8")) as SealedTokenEnvelope;

  if (sealed.algorithm !== algorithm || sealed.keyVersion !== keyVersion) {
    throw new Error("Unsupported token envelope format.");
  }

  const decipher = createDecipheriv(
    algorithm,
    getEncryptionKey(),
    Buffer.from(sealed.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(sealed.authTag, "base64"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(sealed.ciphertext, "base64")),
    decipher.final()
  ]);

  return JSON.parse(plaintext.toString("utf8")) as TokenEnvelope;
}

export async function storeOAuthToken(input: VaultStorageInput): Promise<VaultStorageResult> {
  const keyStatus = getEncryptionKeyStatus();
  const baseResult = {
    vaultAdapter: "implemented" as const,
    ...keyStatus
  };
  const diagnostics: VaultStorageDiagnostics = {
    storageStep: "init",
    tenantResolved: false,
    tenantIdPresent: false,
    providerAccountIdPresent: Boolean(input.providerUserId),
    modelsUsed: ["Tenant", "SocialAccount", "OAuthCredential", "OAuthConnection"]
  };

  if (!keyStatus.encryptionKeyPresent) {
    return {
      ...baseResult,
      ...diagnostics,
      tokenStored: false,
      storageBlockedBy: "missing_ENCRYPTION_KEY"
    };
  }

  if (!keyStatus.encryptionKeyValidLength) {
    return {
      ...baseResult,
      ...diagnostics,
      tokenStored: false,
      storageBlockedBy: "invalid_ENCRYPTION_KEY_length"
    };
  }

  const prisma = getPrisma();
  const scopes = input.scopes ?? instagramScopes;
  const expiresAt = typeof input.expiresIn === "number"
    ? new Date(Date.now() + input.expiresIn * 1000)
    : null;
  const encryptedBlob = await sealTokenEnvelope({
    provider: input.provider,
    accessToken: input.accessToken,
    tokenType: input.tokenType,
    providerUserId: input.providerUserId,
    expiresAt: expiresAt?.toISOString() ?? null,
    scopes
  });

  try {
    const stored = await prisma.$transaction(async (tx: VaultTransactionClient) => {
      diagnostics.storageStep = "tenant_lookup";
      const tenant = await tx.tenant.findUnique({
        where: { slug: input.tenantSlug }
      });

      if (!tenant) {
        throw new Error("tenant_not_found");
      }

      diagnostics.tenantResolved = true;
      diagnostics.tenantIdPresent = Boolean(tenant.id);
      diagnostics.storageStep = "social_account_find";
      const existingSocialAccount = await tx.socialAccount.findFirst({
        where: {
          tenantId: tenant.id,
          network: "INSTAGRAM",
          externalAccountId: input.providerUserId
        }
      });

      diagnostics.storageStep = existingSocialAccount
        ? "social_account_update"
        : "social_account_create";
      const socialAccount = existingSocialAccount
        ? await tx.socialAccount.update({
            where: { id: existingSocialAccount.id },
            data: {
              status: "connected",
              scopes
            }
          })
        : await tx.socialAccount.create({
            data: {
              tenantId: tenant.id,
              network: "INSTAGRAM",
              externalAccountId: input.providerUserId,
              status: "connected",
              scopes
            }
          });

      diagnostics.storageStep = "oauth_connection_find";
      const existingConnection = await tx.oAuthConnection.findFirst({
        where: {
          tenantId: tenant.id,
          provider: input.provider,
          providerUserId: input.providerUserId
        }
      });

      diagnostics.storageStep = existingConnection?.tokenRef
        ? "oauth_credential_update"
        : "oauth_credential_create";
      const credential = existingConnection?.tokenRef
        ? await tx.oAuthCredential.update({
            where: { id: existingConnection.tokenRef },
            data: {
              socialAccountId: socialAccount.id,
              encryptedBlob,
              keyVersion,
              expiresAt,
              rotatedAt: new Date()
            }
          })
        : await tx.oAuthCredential.create({
            data: {
              tenantId: tenant.id,
              socialAccountId: socialAccount.id,
              provider: "instagram",
              label: `instagram:${input.providerUserId}`,
              encryptedBlob,
              keyVersion,
              expiresAt
            }
          });

      diagnostics.storageStep = existingConnection
        ? "oauth_connection_update"
        : "oauth_connection_create";
      const connection = existingConnection
        ? await tx.oAuthConnection.update({
            where: { id: existingConnection.id },
            data: {
              socialAccountId: socialAccount.id,
              scopes,
              status: "connected",
              tokenRef: credential.id,
              expiresAt,
              connectedAt: new Date()
            }
          })
        : await tx.oAuthConnection.create({
            data: {
              tenantId: tenant.id,
              socialAccountId: socialAccount.id,
              provider: input.provider,
              providerUserId: input.providerUserId,
              scopes,
              status: "connected",
              tokenRef: credential.id,
              expiresAt,
              connectedAt: new Date()
            }
          });

      return {
        tenantSlug: tenant.slug,
        providerUserId: input.providerUserId,
        expiresAt: expiresAt?.toISOString() ?? null
      };
    });

    return {
      ...baseResult,
      ...diagnostics,
      storageStep: "complete",
      tokenStored: true,
      provider: "instagram",
      ...stored
    };
  } catch (error) {
    const safeError = getSafePrismaError(error);
    const storageBlockedBy = error instanceof Error && error.message === "tenant_not_found"
      ? "tenant_not_found"
      : "vault_storage_failed";

    return {
      ...baseResult,
      ...diagnostics,
      ...safeError,
      tokenStored: false,
      storageBlockedBy
    };
  }
}

export { instagramScopes };

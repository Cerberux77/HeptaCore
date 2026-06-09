import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const algorithm = "aes-256-gcm";
const keyVersion = "enc:v1:aes-256-gcm";
const instagramScopes = [
  "instagram_business_basic",
  "instagram_business_content_publish"
];

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

export function getEncryptionKeyStatus() {
  const value = process.env.ENCRYPTION_KEY;
  if (!value) {
    return {
      encryptionKeyPresent: false,
      encryptionKeyValidLength: false
    };
  }

  return {
    encryptionKeyPresent: true,
    encryptionKeyValidLength: Buffer.from(value, "base64").length === 32
  };
}

export function canPersistEncryptedTokens() {
  const status = getEncryptionKeyStatus();
  return status.encryptionKeyPresent && status.encryptionKeyValidLength;
}

function getEncryptionKey() {
  const value = process.env.ENCRYPTION_KEY;
  const key = value ? Buffer.from(value, "base64") : Buffer.alloc(0);

  if (key.length !== 32) {
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

  if (!keyStatus.encryptionKeyPresent) {
    return {
      ...baseResult,
      tokenStored: false,
      storageBlockedBy: "missing_ENCRYPTION_KEY"
    };
  }

  if (!keyStatus.encryptionKeyValidLength) {
    return {
      ...baseResult,
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
      const tenant = await tx.tenant.findUnique({
        where: { slug: input.tenantSlug }
      });

      if (!tenant) {
        throw new Error("tenant_not_found");
      }

      const socialAccount = await tx.socialAccount.upsert({
        where: {
          tenantId_network_externalAccountId: {
            tenantId: tenant.id,
            network: "INSTAGRAM",
            externalAccountId: input.providerUserId
          }
        },
        update: {
          status: "connected",
          scopes
        },
        create: {
          tenantId: tenant.id,
          network: "INSTAGRAM",
          externalAccountId: input.providerUserId,
          status: "connected",
          scopes
        }
      });

      const existingConnection = await tx.oAuthConnection.findFirst({
        where: {
          tenantId: tenant.id,
          provider: input.provider,
          providerUserId: input.providerUserId
        }
      });

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
      tokenStored: true,
      provider: "instagram",
      ...stored
    };
  } catch (error) {
    const storageBlockedBy = error instanceof Error && error.message === "tenant_not_found"
      ? "tenant_not_found"
      : "vault_storage_failed";

    return {
      ...baseResult,
      tokenStored: false,
      storageBlockedBy
    };
  }
}

export { instagramScopes };

import crypto from "node:crypto";
import { prisma } from "./prisma";
import { decryptJson } from "./token-vault";

function getSecretSource(): string {
  if (process.env.TOKEN_VAULT_SECRET) return "TOKEN_VAULT_SECRET";
  if (process.env.AUTH_SECRET) return "AUTH_SECRET";
  if (process.env.NEXTAUTH_SECRET) return "NEXTAUTH_SECRET";
  return "NONE";
}

function getKeyFingerprint(): string {
  const raw =
    process.env.TOKEN_VAULT_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET;
  if (!raw) return "N/A";
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 12);
}

export interface DecryptResult {
  ok: true;
  accessToken: string;
  credentialId: string;
  connectionId: string;
  socialAccountId: string;
  providerUserId: string;
  provider: string;
  tenantId: string;
}

export interface DecryptError {
  ok: false;
  code: string;
  error: string;
  detail?: unknown;
}

export type CredentialResolution = DecryptResult | DecryptError;

export async function resolveAndDecryptOAuthCredential(params: {
  tenantId: string;
  provider: string;
  socialAccountId: string;
  credentialLabel?: string;
}): Promise<CredentialResolution> {
  const { tenantId, provider, socialAccountId, credentialLabel } = params;
  const label = credentialLabel || "facebook_page_oauth";

  // 1. Resolve OAuthConnection — follows tokenRef exclusively
  const oauthConnection = await prisma.oAuthConnection.findFirst({
    where: {
      tenantId,
      provider: provider as any,
      status: "connected",
      socialAccountId,
      tokenRef: { not: null },
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, tokenRef: true, expiresAt: true, socialAccountId: true, providerUserId: true },
  });

  if (!oauthConnection || !oauthConnection.tokenRef) {
    return {
      ok: false,
      code: "LIVE_BLOCKED_NO_CREDENTIAL",
      error: `No active ${provider} OAuth connection found for socialAccount ${socialAccountId}.`,
    };
  }

  if (oauthConnection.expiresAt && oauthConnection.expiresAt < new Date()) {
    return {
      ok: false,
      code: "LIVE_BLOCKED_NO_CREDENTIAL",
      error: `${provider} OAuth connection is expired.`,
    };
  }

  // 2. Load exactly the credential referenced by tokenRef
  const credential = await prisma.credentialVaultItem.findFirst({
    where: {
      id: oauthConnection.tokenRef,
      tenantId,
      provider: provider as any,
      label,
    },
    select: { id: true, encryptedBlob: true, expiresAt: true },
  });

  if (!credential || !credential.encryptedBlob) {
    return {
      ok: false,
      code: "LIVE_BLOCKED_NO_CREDENTIAL",
      error: `No valid ${provider} credential found (tokenRef=${oauthConnection.tokenRef}).`,
    };
  }

  if (credential.expiresAt && credential.expiresAt < new Date()) {
    return {
      ok: false,
      code: "LIVE_BLOCKED_NO_CREDENTIAL",
      error: `${provider} credential is expired.`,
    };
  }

  // 3. Decrypt
  let decrypted: { access_token: string };
  try {
    decrypted = decryptJson<{ access_token: string }>(credential.encryptedBlob);
  } catch (err) {
    return {
      ok: false,
      code: "LIVE_BLOCKED_DECRYPT_FAILED",
      error: `Failed to decrypt ${provider} credential.`,
      detail: {
        credentialId: credential.id,
        connectionId: oauthConnection.id,
        blobLength: credential.encryptedBlob?.length,
        message: err instanceof Error ? err.message : "unknown",
        constructorName: credential.encryptedBlob?.constructor?.name,
        keySource: getSecretSource(),
        keyFingerprint: getKeyFingerprint(),
        ciphertextFingerprint: crypto.createHash("sha256").update(credential.encryptedBlob!).digest("hex").slice(0, 12),
      },
    };
  }

  if (!decrypted?.access_token) {
    return {
      ok: false,
      code: "LIVE_BLOCKED_DECRYPT_FAILED",
      error: `Decrypted ${provider} credential missing access_token.`,
    };
  }

  return {
    ok: true,
    accessToken: decrypted.access_token,
    credentialId: credential.id,
    connectionId: oauthConnection.id,
    socialAccountId: oauthConnection.socialAccountId!,
    providerUserId: oauthConnection.providerUserId!,
    provider,
    tenantId,
  };
}

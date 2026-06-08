export type TokenEnvelope = {
  provider: "FACEBOOK" | "INSTAGRAM" | "WHATSAPP";
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  scopes?: string[];
};

export function canPersistEncryptedTokens() {
  return Boolean(process.env.ENCRYPTION_KEY);
}

export async function sealTokenEnvelope(_: TokenEnvelope): Promise<never> {
  throw new Error("Token encryption is not implemented. Configure ENCRYPTION_KEY and a vault adapter before storing OAuth tokens.");
}


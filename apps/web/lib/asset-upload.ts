import type { TenantAssetItem } from "./dashboard";

export async function waitForRegisteredAsset(
  tenantSlug: string,
  storageKey: string,
  options?: { attempts?: number; initialDelayMs?: number; maxDelayMs?: number }
): Promise<{ found: boolean; asset?: TenantAssetItem; attempts: number }> {
  const attempts = options?.attempts ?? 10;
  const initialDelayMs = options?.initialDelayMs ?? 250;
  const maxDelayMs = options?.maxDelayMs ?? 1500;

  for (let i = 1; i <= attempts; i++) {
    const res = await fetch(`/api/tenants/${tenantSlug}/assets/by-storage-key`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storageKey }),
    });
    const data = await res.json();
    if (data.ok && data.found) {
      return { found: true, asset: data.asset, attempts: i };
    }
    if (i < attempts) {
      const delay = Math.min(initialDelayMs * Math.pow(2, i - 1), maxDelayMs);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return { found: false, attempts };
}

import type { TenantAssetItem } from "./dashboard";

export interface WaitForRegisteredAssetResult {
  found: boolean;
  asset?: TenantAssetItem;
  attempts: number;
  lastStatus?: number;
  lastError?: string;
  retryable: boolean;
}

export async function waitForRegisteredAsset(
  tenantSlug: string,
  storageKey: string,
  options?: { attempts?: number; initialDelayMs?: number; maxDelayMs?: number }
): Promise<WaitForRegisteredAssetResult> {
  const maxAttempts = options?.attempts ?? 10;
  const initialDelayMs = options?.initialDelayMs ?? 250;
  const maxDelayMs = options?.maxDelayMs ?? 1500;
  let lastStatus: number | undefined;
  let lastError: string | undefined;

  for (let i = 1; i <= maxAttempts; i++) {
    let res: Response;
    try {
      res = await fetch(`/api/tenants/${tenantSlug}/assets/by-storage-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storageKey }),
      });
    } catch (networkError) {
      lastError = networkError instanceof TypeError
        ? `Network error: ${networkError.message}`
        : `Fetch failed: ${String(networkError)}`;
      if (i < maxAttempts) {
        const delay = Math.min(initialDelayMs * Math.pow(2, i - 1), maxDelayMs);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      return { found: false, attempts: i, lastStatus, lastError, retryable: true };
    }

    lastStatus = res.status;

    if (!res.ok) {
      if (res.status === 404 || res.status === 429 || res.status >= 500) {
        lastError = `HTTP ${res.status}: ${res.statusText || "Server error"}`;
        if (i < maxAttempts) {
          const delay = Math.min(initialDelayMs * Math.pow(2, i - 1), maxDelayMs);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        return { found: false, attempts: i, lastStatus, lastError, retryable: true };
      }
      lastError = `HTTP ${res.status}: ${res.statusText || "Client error"} (not retryable)`;
      return { found: false, attempts: i, lastStatus, lastError, retryable: false };
    }

    let data: any;
    try {
      data = await res.json();
    } catch {
      lastError = `Response is not valid JSON (HTTP ${res.status})`;
      if (i < maxAttempts) {
        const delay = Math.min(initialDelayMs * Math.pow(2, i - 1), maxDelayMs);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      return { found: false, attempts: i, lastStatus, lastError, retryable: true };
    }

    if (data.ok && data.found) {
      return { found: true, asset: data.asset, attempts: i, lastStatus, retryable: false };
    }

    if (i < maxAttempts) {
      const delay = Math.min(initialDelayMs * Math.pow(2, i - 1), maxDelayMs);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return { found: false, attempts: maxAttempts, lastStatus, lastError: lastError ?? "Max attempts exceeded", retryable: true };
}

import type { TenantAssetItem } from "./dashboard";

export interface WaitForRegisteredAssetResult {
  found: boolean;
  asset?: TenantAssetItem;
  attempts: number;
  lastStatus?: number;
  lastError?: string;
  retryable: boolean;
}

export interface FinalizeUploadedAssetPayload {
  pathname: string;
  url: string;
  contentType: string;
  size: number;
  filename: string;
  folder?: string;
  technicalMetadata?: unknown;
}

export class AssetFinalizeError extends Error {
  lookupResult?: WaitForRegisteredAssetResult;

  constructor(
    message: string,
    public code = "ASSET_FINALIZE_FAILED",
    public status?: number,
    public retryable = false,
  ) {
    super(message);
  }
}

type FinalizeUploadedAssetDeps = {
  finalizeUploadedAsset: (
    tenantSlug: string,
    payload: FinalizeUploadedAssetPayload,
    options?: { signal?: AbortSignal },
  ) => Promise<TenantAssetItem>;
  waitForRegisteredAsset: (
    tenantSlug: string,
    storageKey: string,
    options?: { attempts?: number; initialDelayMs?: number; maxDelayMs?: number },
  ) => Promise<WaitForRegisteredAssetResult>;
};

type FinalizeUploadedAssetOptions = {
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
};

export type ResolveUploadedAssetResult =
  | { outcome: "ready"; asset: TenantAssetItem; source: "finalize" | "fallback"; attempts?: number }
  | { outcome: "missing-blob"; error: AssetFinalizeError };

function shouldRetryFinalizeStatus(status: number | undefined): boolean {
  return status === 408 || status === 429 || (status != null && status >= 500);
}

function shouldFallbackAfterFinalizeError(error: unknown): boolean {
  if (error instanceof AssetFinalizeError) return error.retryable;
  return error instanceof TypeError || (error instanceof Error && error.name === "AbortError");
}

export async function waitForRegisteredAsset(
  tenantSlug: string,
  storageKey: string,
  options?: { attempts?: number; initialDelayMs?: number; maxDelayMs?: number },
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

export async function finalizeUploadedAsset(
  tenantSlug: string,
  payload: FinalizeUploadedAssetPayload,
  options?: FinalizeUploadedAssetOptions,
): Promise<TenantAssetItem> {
  const fetchImpl = options?.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(`/api/tenants/${tenantSlug}/assets/finalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: options?.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AssetFinalizeError("Asset finalization timed out.", "ASSET_FINALIZE_TIMEOUT", undefined, true);
    }
    if (error instanceof TypeError) {
      throw new AssetFinalizeError(`Finalize request failed: ${error.message}`, "ASSET_FINALIZE_NETWORK_ERROR", undefined, true);
    }
    throw error;
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    if (!res.ok) {
      throw new AssetFinalizeError(`Finalize failed with HTTP ${res.status}.`, "ASSET_FINALIZE_BAD_RESPONSE", res.status, shouldRetryFinalizeStatus(res.status));
    }
    throw new AssetFinalizeError("Finalize response is not valid JSON.", "ASSET_FINALIZE_BAD_RESPONSE", res.status, true);
  }

  if (!res.ok || !data?.ok || !data?.asset) {
    const message = typeof data?.error === "string" && data.error.trim()
      ? data.error
      : `Finalize failed with HTTP ${res.status}.`;
    const code = typeof data?.code === "string" ? data.code : "ASSET_FINALIZE_FAILED";
    throw new AssetFinalizeError(message, code, res.status, shouldRetryFinalizeStatus(res.status));
  }

  return data.asset as TenantAssetItem;
}

export async function resolveUploadedAssetAfterUpload(
  tenantSlug: string,
  payload: FinalizeUploadedAssetPayload,
  options?: {
    timeoutMs?: number;
    attempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    deps?: Partial<FinalizeUploadedAssetDeps>;
  },
): Promise<ResolveUploadedAssetResult> {
  const deps: FinalizeUploadedAssetDeps = {
    finalizeUploadedAsset,
    waitForRegisteredAsset,
    ...options?.deps,
  };
  const timeoutMs = options?.timeoutMs ?? 12000;
  const controller = typeof AbortController === "undefined" ? null : new AbortController();
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;

  try {
    const asset = await deps.finalizeUploadedAsset(tenantSlug, payload, { signal: controller?.signal });
    return { outcome: "ready", asset, source: "finalize" };
  } catch (error) {
    if (error instanceof AssetFinalizeError && error.code === "ASSET_BLOB_NOT_FOUND") {
      return { outcome: "missing-blob", error };
    }
    if (!shouldFallbackAfterFinalizeError(error)) {
      throw error;
    }

    const lookup = await deps.waitForRegisteredAsset(tenantSlug, payload.pathname, {
      attempts: options?.attempts,
      initialDelayMs: options?.initialDelayMs,
      maxDelayMs: options?.maxDelayMs,
    });
    if (lookup.found && lookup.asset) {
      return { outcome: "ready", asset: lookup.asset, source: "fallback", attempts: lookup.attempts };
    }

    const finalizeError = error instanceof AssetFinalizeError
      ? error
      : new AssetFinalizeError(
        lookup.lastError ?? (error instanceof Error ? error.message : "Asset finalize failed."),
        "ASSET_FINALIZE_FALLBACK_FAILED",
        lookup.lastStatus,
        lookup.retryable,
      );
    finalizeError.lookupResult = lookup;
    throw finalizeError;
  } finally {
    if (timeoutId != null) clearTimeout(timeoutId);
  }
}

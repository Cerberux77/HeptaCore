const DEV_ORIGIN_RE = /^http:\/\/localhost(:\d+)?$/;

const VALID_PROTOCOLS = new Set(["http:", "https:"]);

export class OriginResolutionError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "OriginResolutionError";
  }
}

export function resolvePublicOrigin(requestOrigin?: string | null): string {
  if (requestOrigin) {
    let origin = requestOrigin.trim().replace(/\/+$/, "");
    if (!origin) {
      throw new OriginResolutionError("Empty origin after trimming", "EMPTY_ORIGIN");
    }

    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new OriginResolutionError(`Invalid origin format: ${origin.slice(0, 80)}`, "MALFORMED_ORIGIN");
    }

    if (!VALID_PROTOCOLS.has(parsed.protocol)) {
      throw new OriginResolutionError(
        `Rejected origin protocol: ${parsed.protocol}`,
        "INVALID_PROTOCOL",
      );
    }

    if (!parsed.hostname) {
      throw new OriginResolutionError("Origin has no hostname", "EMPTY_HOST");
    }

    const normalized = `${parsed.protocol}//${parsed.host}${parsed.port ? "" : ""}`;

    const isProduction = process.env.NODE_ENV === "production";
    if (parsed.protocol === "http:") {
      const isDevLocalhost = DEV_ORIGIN_RE.test(normalized);
      if (isDevLocalhost && !isProduction) {
        return normalized;
      }
      throw new OriginResolutionError(
        `HTTP origin rejected: ${normalized}`,
        "HTTP_NOT_ALLOWED",
      );
    }

    return normalized;
  }

  if (process.env.NODE_ENV === "production") {
    throw new OriginResolutionError(
      "No request origin available in production mode",
      "MISSING_ORIGIN",
    );
  }

  return "http://localhost:3000";
}

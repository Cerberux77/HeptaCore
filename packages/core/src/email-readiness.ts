export type EmailProviderKind = "disabled" | "resend" | "unsupported";
export type EmailSenderKind = "missing" | "invalid" | "provider_test" | "shared_platform" | "custom";
export type EmailOriginKind = "missing" | "invalid" | "localhost" | "vercel_default" | "custom";

export interface ResendDomainReadiness {
  found: boolean;
  status: string | null;
  sending: string | null;
  spfVerified: boolean;
  dkimVerified: boolean;
  dmarcPresent: boolean;
}

export interface EmailReadinessInput {
  provider?: string | null;
  apiKeyConfigured: boolean;
  webhookSecretConfigured: boolean;
  from?: string | null;
  replyTo?: string | null;
  appUrl?: string | null;
  vercelUrl?: string | null;
  brandDomain?: string | null;
  resendDomain?: ResendDomainReadiness | null;
}

export interface ParsedEmailSender {
  raw: string | null;
  address: string | null;
  domain: string | null;
  kind: EmailSenderKind;
}

export interface ParsedEmailOrigin {
  origin: string | null;
  host: string | null;
  secure: boolean;
  kind: EmailOriginKind;
}

export interface EmailReadinessReport {
  provider: EmailProviderKind;
  providerConfigured: boolean;
  webhookConfigured: boolean;
  sender: ParsedEmailSender;
  replyToConfigured: boolean;
  origin: ParsedEmailOrigin;
  brandDomain: string | null;
  brandAligned: boolean;
  resendDomain: ResendDomainReadiness | null;
  developmentReady: boolean;
  productionReady: boolean;
  developmentBlockers: string[];
  productionBlockers: string[];
  deferredProductionWork: string[];
}

const SIMPLE_EMAIL = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;

function normalizeDomain(value?: string | null): string | null {
  const normalized = value?.trim().toLowerCase().replace(/^\.+|\.+$/g, "");
  return normalized || null;
}

export function parseEmailSender(value?: string | null): ParsedEmailSender {
  const raw = value?.trim() || null;
  if (!raw) return { raw: null, address: null, domain: null, kind: "missing" };

  const bracketMatch = raw.match(/<([^<>]+)>\s*$/);
  const address = (bracketMatch?.[1] || raw).trim().toLowerCase();
  if (!SIMPLE_EMAIL.test(address)) return { raw, address: null, domain: null, kind: "invalid" };

  const domain = address.split("@")[1] || null;
  if (!domain) return { raw, address: null, domain: null, kind: "invalid" };
  if (domain === "resend.dev" || domain.endsWith(".resend.dev")) {
    return { raw, address, domain, kind: "provider_test" };
  }
  if (domain === "vercel.app" || domain.endsWith(".vercel.app")) {
    return { raw, address, domain, kind: "shared_platform" };
  }
  return { raw, address, domain, kind: "custom" };
}

export function parseEmailOrigin(appUrl?: string | null, vercelUrl?: string | null): ParsedEmailOrigin {
  let candidate = appUrl?.trim() || vercelUrl?.trim() || "";
  if (!candidate) return { origin: null, host: null, secure: false, kind: "missing" };
  if (!/^https?:\/\//i.test(candidate) && vercelUrl?.trim() === candidate) candidate = `https://${candidate}`;

  try {
    const url = new URL(candidate);
    if (!url.hostname || (url.protocol !== "https:" && url.protocol !== "http:")) {
      return { origin: null, host: null, secure: false, kind: "invalid" };
    }
    const host = url.hostname.toLowerCase();
    const localhost = host === "localhost" || host === "127.0.0.1" || host === "::1";
    const secure = url.protocol === "https:";
    if (!localhost && !secure) return { origin: url.origin, host, secure: false, kind: "invalid" };
    return {
      origin: url.origin,
      host,
      secure,
      kind: localhost ? "localhost" : host === "vercel.app" || host.endsWith(".vercel.app") ? "vercel_default" : "custom",
    };
  } catch {
    return { origin: null, host: null, secure: false, kind: "invalid" };
  }
}

function domainMatchesBrand(domain: string | null, brandDomain: string | null): boolean {
  if (!domain || !brandDomain) return false;
  return domain === brandDomain || domain.endsWith(`.${brandDomain}`);
}

export function evaluateEmailReadiness(input: EmailReadinessInput): EmailReadinessReport {
  const providerRaw = input.provider?.trim().toLowerCase() || "disabled";
  const provider: EmailProviderKind = providerRaw === "disabled" ? "disabled" : providerRaw === "resend" ? "resend" : "unsupported";
  const sender = parseEmailSender(input.from);
  const origin = parseEmailOrigin(input.appUrl, input.vercelUrl);
  const brandDomain = normalizeDomain(input.brandDomain);
  const brandAligned = domainMatchesBrand(sender.domain, brandDomain) && domainMatchesBrand(origin.host, brandDomain);
  const resendDomain = input.resendDomain || null;

  const developmentBlockers: string[] = [];
  if (provider !== "resend") developmentBlockers.push(provider === "disabled" ? "EMAIL_PROVIDER_DISABLED" : "EMAIL_PROVIDER_UNSUPPORTED");
  if (!input.apiKeyConfigured) developmentBlockers.push("RESEND_API_KEY_MISSING");
  if (!input.webhookSecretConfigured) developmentBlockers.push("RESEND_WEBHOOK_SECRET_MISSING");
  if (sender.kind === "missing") developmentBlockers.push("EMAIL_FROM_MISSING");
  if (sender.kind === "invalid") developmentBlockers.push("EMAIL_FROM_INVALID");
  if (sender.kind === "shared_platform") developmentBlockers.push("VERCEL_APP_CANNOT_BE_EMAIL_SENDER");
  if (origin.kind === "missing") developmentBlockers.push("APP_ORIGIN_MISSING");
  if (origin.kind === "invalid") developmentBlockers.push("APP_ORIGIN_INVALID");

  if (sender.kind === "custom") {
    if (!resendDomain?.found) developmentBlockers.push("RESEND_DOMAIN_NOT_FOUND");
    else if (resendDomain.status !== "verified" || resendDomain.sending !== "enabled") developmentBlockers.push("RESEND_DOMAIN_NOT_VERIFIED");
  }

  const productionBlockers = [...developmentBlockers];
  if (sender.kind === "provider_test") productionBlockers.push("PROVIDER_TEST_SENDER_NOT_ALLOWED_IN_PRODUCTION");
  if (sender.kind !== "custom") productionBlockers.push("CUSTOM_SENDER_DOMAIN_REQUIRED");
  if (!brandDomain) productionBlockers.push("BRAND_DOMAIN_NOT_CONFIGURED");
  if (brandDomain && !brandAligned) productionBlockers.push("BRAND_DOMAIN_MISMATCH");
  if (sender.kind === "custom") {
    if (!resendDomain?.spfVerified) productionBlockers.push("SPF_NOT_VERIFIED");
    if (!resendDomain?.dkimVerified) productionBlockers.push("DKIM_NOT_VERIFIED");
    if (!resendDomain?.dmarcPresent) productionBlockers.push("DMARC_NOT_PRESENT");
  }
  if (origin.kind === "localhost") productionBlockers.push("LOCALHOST_ORIGIN_NOT_ALLOWED_IN_PRODUCTION");
  if (origin.kind === "vercel_default") productionBlockers.push("OFFICIAL_WEB_DOMAIN_DEFERRED");

  const unique = (values: string[]) => [...new Set(values)];
  const dev = unique(developmentBlockers);
  const prod = unique(productionBlockers);

  return {
    provider,
    providerConfigured: provider === "resend" && input.apiKeyConfigured,
    webhookConfigured: input.webhookSecretConfigured,
    sender,
    replyToConfigured: Boolean(input.replyTo?.trim()),
    origin,
    brandDomain,
    brandAligned,
    resendDomain,
    developmentReady: dev.length === 0,
    productionReady: prod.length === 0,
    developmentBlockers: dev,
    productionBlockers: prod,
    deferredProductionWork: [
      "Configure an owned HeptaCore sender domain in Resend.",
      "Verify Resend SPF and DKIM records and publish a DMARC policy.",
      "Move the web origin from the temporary Vercel domain to the official HeptaCore domain.",
    ],
  };
}

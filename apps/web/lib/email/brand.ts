const DEFAULT_EMAIL_FROM = "HeptaCore <noreply@heptacore.dev>";
const DEFAULT_BRAND_DOMAIN = "heptacore.dev";

function extractEmailAddress(input: string): string | null {
  const trimmed = String(input || "").trim();
  if (!trimmed) return null;

  const angled = trimmed.match(/<([^>]+)>/);
  const candidate = (angled?.[1] || trimmed).trim();
  return candidate.includes("@") ? candidate : null;
}

export function getBrandDomain(from = process.env.EMAIL_FROM || DEFAULT_EMAIL_FROM): string {
  const address = extractEmailAddress(from);
  if (!address) return DEFAULT_BRAND_DOMAIN;

  const domain = address.split("@")[1]?.trim().toLowerCase();
  return domain || DEFAULT_BRAND_DOMAIN;
}

export function getBrandContactEmail(lang: "es" | "en", from = process.env.EMAIL_FROM || DEFAULT_EMAIL_FROM): string {
  const domain = getBrandDomain(from);
  return `${lang === "es" ? "soporte" : "support"}@${domain}`;
}

export function getPrivacyEmail(from = process.env.EMAIL_FROM || DEFAULT_EMAIL_FROM): string {
  return `privacy@${getBrandDomain(from)}`;
}

const callbackPath = "/api/oauth/instagram/callback";
const productionOrigin = "https://heptacore.vercel.app";

function cleanUrl(value: string) {
  return value.trim().replace(/^['"]|['"]$/g, "").replace(/\/$/, "");
}

export function getInstagramRedirectUri(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin === "null" ? productionOrigin : requestUrl.origin;
  return cleanUrl(new URL(callbackPath, origin).toString());
}

export function getConfiguredInstagramRedirectUri() {
  const value = process.env.INSTAGRAM_REDIRECT_URI;
  return value ? cleanUrl(value) : null;
}

export function getSafeInstagramRedirectUri(value: string | null | undefined) {
  if (!value) return null;

  const cleaned = cleanUrl(value);

  try {
    const url = new URL(cleaned);
    if (url.pathname !== callbackPath) return null;
    if (url.protocol !== "https:" && url.hostname !== "localhost") return null;
    return cleaned;
  } catch {
    return null;
  }
}

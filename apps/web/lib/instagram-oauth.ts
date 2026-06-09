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


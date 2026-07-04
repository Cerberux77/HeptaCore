import { PublishInput, PublishResult, Publisher, PublisherCapabilities, ProviderError } from "./types";

const UPLOAD_SCOPE = "https://www.googleapis.com/auth/youtube.upload";

const capabilities: PublisherCapabilities = {
  textOnly: false,
  image: false,
  video: true,
  carousel: false,
  story: false,
  reels: false,
  scheduling: false,
};

function sanitizeText(value: string | undefined, fallback: string, maxLength: number): string {
  const clean = (value || fallback).replace(/\s+/g, " ").trim();
  return clean.slice(0, maxLength) || fallback.slice(0, maxLength) || "HeptaCore upload";
}

function isShortFormat(format: string | undefined): boolean {
  const normalized = (format || "").toUpperCase();
  return normalized === "YOUTUBE_SHORT" || normalized === "SHORT" || normalized === "VERTICAL_VIDEO";
}

function parseYouTubeError(payload: unknown, status: number): string {
  const top = payload as Record<string, unknown> | null;
  const error = top?.error as Record<string, unknown> | undefined;
  const details = Array.isArray(error?.errors) ? (error?.errors as Array<Record<string, unknown>>) : [];
  const reasons = details.map((entry) => entry.reason).filter(Boolean).map(String);
  const message = error?.message ? String(error.message) : `HTTP ${status}`;
  return reasons.length > 0 ? `${message} (${reasons.join(", ")})` : message;
}

function classifyYouTubeError(status: number, payload: unknown): ProviderError {
  const message = parseYouTubeError(payload, status);
  const ambiguous = status >= 500 || status === 429;
  return new ProviderError(message, { httpStatus: status, isAmbiguous: ambiguous });
}

async function fetchBinary(url: string, purpose: string): Promise<{ body: ArrayBuffer; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new ProviderError(`Failed to fetch ${purpose}: HTTP ${response.status}`, {
      httpStatus: response.status,
      isAmbiguous: response.status >= 500,
    });
  }
  const body = await response.arrayBuffer();
  const mimeType = response.headers.get("content-type") || "application/octet-stream";
  return { body, mimeType };
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new ProviderError("Google OAuth client credentials are not configured for refresh.", {
      isAmbiguous: false,
    });
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload || typeof payload !== "object" || typeof (payload as Record<string, unknown>).access_token !== "string") {
    throw classifyYouTubeError(response.status, payload);
  }

  return String((payload as Record<string, unknown>).access_token);
}

async function initializeUpload(accessToken: string, metadata: Record<string, unknown>): Promise<string> {
  const response = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": "video/mp4",
    },
    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw classifyYouTubeError(response.status, payload);
  }

  const location = response.headers.get("location");
  if (!location) {
    throw new ProviderError("YouTube resumable upload session missing location header.", {
      httpStatus: response.status,
      isAmbiguous: true,
    });
  }

  return location;
}

async function uploadVideo(uploadUrl: string, accessToken: string, mediaUrl: string): Promise<Record<string, unknown>> {
  const media = await fetchBinary(mediaUrl, "video asset");
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Length": String(media.body.byteLength),
      "Content-Type": media.mimeType,
    },
    body: media.body,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload || typeof payload !== "object" || !("id" in payload)) {
    throw classifyYouTubeError(response.status, payload);
  }

  return payload as Record<string, unknown>;
}

async function setThumbnail(accessToken: string, videoId: string, thumbnailUrl: string): Promise<void> {
  const thumbnail = await fetchBinary(thumbnailUrl, "thumbnail asset");
  const response = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${encodeURIComponent(videoId)}&uploadType=media`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Length": String(thumbnail.body.byteLength),
      "Content-Type": thumbnail.mimeType,
    },
    body: thumbnail.body,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw classifyYouTubeError(response.status, payload);
  }
}

async function publishToYouTube(input: PublishInput): Promise<PublishResult> {
  const { accessToken, refreshToken, mediaUrl, title, description, caption, thumbnailUrl, format } = input;
  if (!mediaUrl) {
    throw new ProviderError("YouTube publishing requires a public video asset URL.", {
      isAmbiguous: false,
    });
  }

  const snippetTitle = sanitizeText(title, caption, 100);
  const snippetDescription = sanitizeText(description, caption, 5000);
  const effectiveAccessToken = refreshToken ? await refreshAccessToken(refreshToken) : accessToken;
  const metadata = {
    snippet: {
      title: snippetTitle,
      description: snippetDescription,
      categoryId: "22",
    },
    status: {
      privacyStatus: process.env.YOUTUBE_DEFAULT_PRIVACY_STATUS || "private",
      selfDeclaredMadeForKids: false,
    },
  };

  const uploadUrl = await initializeUpload(effectiveAccessToken, metadata);
  const payload = await uploadVideo(uploadUrl, effectiveAccessToken, mediaUrl);
  const videoId = String(payload.id);

  if (thumbnailUrl) {
    await setThumbnail(effectiveAccessToken, videoId, thumbnailUrl);
  }

  return {
    externalPostId: videoId,
    providerResponse: {
      videoId,
      kind: isShortFormat(format) ? "short" : "video",
      privacyStatus: metadata.status.privacyStatus,
      title: snippetTitle,
      refreshedAccessToken: Boolean(refreshToken),
      thumbnailApplied: Boolean(thumbnailUrl),
      raw: payload,
    },
  };
}

export const youtubePublisher: Publisher = {
  network: "YOUTUBE",
  capabilities,
  credentialLabel: "youtube_oauth",
  requiredScopes: [UPLOAD_SCOPE],
  publish: publishToYouTube,
};

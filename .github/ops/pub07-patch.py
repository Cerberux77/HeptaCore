from pathlib import Path
import sys

root = Path(sys.argv[1])
test_template = Path(sys.argv[2])

def replace(path: str, old: str, new: str, count: int = 1) -> None:
    p = root / path
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"needle missing in {path}: {old[:120]!r}")
    p.write_text(text.replace(old, new, count))

replace(
    "apps/web/lib/publishers/types.ts",
    '  mediaType?: "IMAGE" | "VIDEO" | "CAROUSEL";\n}',
    '  mediaType?: "IMAGE" | "VIDEO" | "CAROUSEL";\n'
    '  title?: string | null;\n'
    '  description?: string | null;\n'
    '  tags?: string[] | null;\n'
    '  thumbnailUrl?: string | null;\n'
    '  categoryId?: string | null;\n'
    '  privacyStatus?: "public" | "unlisted" | "private" | null;\n'
    '  madeForKids?: boolean | null;\n'
    '}',
)

replace(
    "apps/web/lib/publishers/index.ts",
    'import { facebookPagePublisher } from "./facebook-page";\n',
    'import { facebookPagePublisher } from "./facebook-page";\nimport { youtubePublisher } from "./youtube";\n',
)
replace(
    "apps/web/lib/publishers/index.ts",
    'registerPublisher(facebookPagePublisher);\n',
    'registerPublisher(facebookPagePublisher);\nregisterPublisher(youtubePublisher);\n',
)
replace(
    "apps/web/lib/publishers/index.ts",
    'export { facebookPagePublisher } from "./facebook-page";\n',
    'export { facebookPagePublisher } from "./facebook-page";\nexport { youtubePublisher } from "./youtube";\n',
)

replace(
    "apps/web/lib/publishers/youtube.ts",
    '  requiredScopes: ["https://www.googleapis.com/auth/youtube.upload"],\n  publish: publishToYouTube,',
    '  requiredScopes: ["https://www.googleapis.com/auth/youtube.upload"],\n'
    '  supportedFormats: ["YOUTUBE_VIDEO", "YOUTUBE_SHORT"],\n'
    '  publish: publishToYouTube,',
)

pf = root / "apps/web/app/api/publishing/pub06-formats.ts"
s = pf.read_text()
s = s.replace(
    'export type Pub06PublishingFormat = PublishingFormat | "INSTAGRAM_REEL" | "FACEBOOK_STORY" | "FACEBOOK_REEL";',
    'export type Pub06PublishingFormat = PublishingFormat | "INSTAGRAM_REEL" | "FACEBOOK_STORY" | "FACEBOOK_REEL" | "YOUTUBE_VIDEO" | "YOUTUBE_SHORT";',
)
needle = '  if (network === "FACEBOOK") {'
if needle not in s:
    raise SystemExit("YouTube normalize insertion point missing")
s = s.replace(
    needle,
    '  if (network === "YOUTUBE") {\n'
    '    if (raw.includes("SHORT")) return "YOUTUBE_SHORT";\n'
    '    return "YOUTUBE_VIDEO";\n'
    '  }\n'
    + needle,
    1,
)
marker = 'export function buildPub06DryRun(format: Pub06PublishingFormat, assets: DraftFormatAsset[]) {'
if marker not in s:
    raise SystemExit("buildPub06DryRun marker missing")
helper = r'''
const YOUTUBE_VIDEO_MIMES = ["video/mp4", "video/quicktime", "video/webm"];
const YOUTUBE_THUMBNAIL_MIMES = ["image/jpeg", "image/png", "image/webp"];

type YouTubePublishingFormat = "YOUTUBE_VIDEO" | "YOUTUBE_SHORT";

function youtubeMime(asset: DraftFormatAsset): string | null {
  const inferred = inferMimeType(asset);
  if (inferred) return inferred;
  const source = `${asset.filename ?? ""} ${asset.url ?? ""}`.toLowerCase().split("?")[0];
  return source.endsWith(".webm") ? "video/webm" : null;
}

function buildYouTubeDryRun(format: YouTubePublishingFormat, assets: DraftFormatAsset[]) {
  const label = format === "YOUTUBE_SHORT" ? "YouTube Shorts" : "YouTube Video 16:9";
  const expectedRatio = format === "YOUTUBE_SHORT" ? 9 / 16 : 16 / 9;
  const aspectRatio = format === "YOUTUBE_SHORT" ? "9 / 16" : "16 / 9";
  const minWidth = format === "YOUTUBE_SHORT" ? 720 : 1280;
  const minHeight = format === "YOUTUBE_SHORT" ? 1280 : 720;
  const maxDurationSeconds = format === "YOUTUBE_SHORT" ? 180 : 12 * 60 * 60;
  const videos = assets.filter((asset) => asset.role !== "thumbnail");
  const thumbnails = assets.filter((asset) => asset.role === "thumbnail");
  const errors: Array<{ code: string; message: string; assetId?: string }> = [];
  const warnings: Array<{ code: string; message: string; assetId?: string }> = [];

  if (videos.length !== 1) errors.push({ code: "ASSET_COUNT", message: `${label} requires exactly one video asset.` });
  const video = videos[0];
  if (video) {
    const mime = youtubeMime(video);
    if (!mime || !YOUTUBE_VIDEO_MIMES.includes(mime)) errors.push({ code: "ASSET_MIME", assetId: video.id, message: `${label} requires MP4, MOV or WebM video.` });
    if (video.width != null && video.height != null) {
      if (video.width < minWidth || video.height < minHeight) errors.push({ code: "ASSET_DIMENSIONS", assetId: video.id, message: `${label} requires at least ${minWidth}x${minHeight}.` });
      const ratio = video.width / video.height;
      if (Math.abs(ratio - expectedRatio) > 0.06) errors.push({ code: "ASSET_ASPECT_RATIO", assetId: video.id, message: `${label} requires ${format === "YOUTUBE_SHORT" ? "9:16" : "16:9"}.` });
    } else warnings.push({ code: "ASSET_DIMENSIONS_UNKNOWN", assetId: video.id, message: "Video dimensions are not stored." });
    if (video.durationSeconds == null) warnings.push({ code: "ASSET_DURATION_UNKNOWN", assetId: video.id, message: "Video duration is not stored." });
    else if (video.durationSeconds > maxDurationSeconds) errors.push({ code: "ASSET_DURATION", assetId: video.id, message: `${label} exceeds ${maxDurationSeconds}s.` });
    if (video.sizeBytes != null && video.sizeBytes > 100 * 1024 * 1024) errors.push({ code: "ASSET_SIZE", assetId: video.id, message: `${label} exceeds the current safe 100MB serverless upload limit.` });
    else if (video.sizeBytes == null) warnings.push({ code: "ASSET_SIZE_UNKNOWN", assetId: video.id, message: "Video size is not stored." });
  }

  if (format === "YOUTUBE_VIDEO") {
    if (thumbnails.length !== 1) errors.push({ code: "THUMBNAIL_REQUIRED", message: "YouTube Video 16:9 requires exactly one thumbnail asset with role=thumbnail." });
    const thumbnail = thumbnails[0];
    if (thumbnail) {
      const mime = inferMimeType(thumbnail);
      if (!mime || !YOUTUBE_THUMBNAIL_MIMES.includes(mime)) errors.push({ code: "THUMBNAIL_MIME", assetId: thumbnail.id, message: "YouTube thumbnail must be JPEG, PNG or WebP." });
      if (!thumbnail.url) errors.push({ code: "THUMBNAIL_NOT_PUBLIC", assetId: thumbnail.id, message: "YouTube thumbnail requires a resolvable public URL." });
      if (thumbnail.sizeBytes != null && thumbnail.sizeBytes > 2 * 1024 * 1024) errors.push({ code: "THUMBNAIL_SIZE", assetId: thumbnail.id, message: "YouTube thumbnail exceeds 2MB." });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    format,
    assets,
    previewData: {
      platform: "YOUTUBE" as const,
      format,
      label,
      aspectRatio,
      safeAreas: format === "YOUTUBE_SHORT" ? { topPercent: 10, bottomPercent: 20, sidePercent: 6 } : undefined,
      assets,
    },
  };
}

'''
s = s.replace(marker, helper + marker, 1)
needle = marker + '\n  if (!NEW_FORMATS.has(format)) return buildMultiformatDryRun(format as PublishingFormat, assets);'
replacement = marker + '\n  if (format === "YOUTUBE_VIDEO" || format === "YOUTUBE_SHORT") return buildYouTubeDryRun(format, assets);\n  if (!NEW_FORMATS.has(format)) return buildMultiformatDryRun(format as PublishingFormat, assets);'
if needle not in s:
    raise SystemExit("buildPub06DryRun body insertion point missing")
s = s.replace(needle, replacement, 1)
pf.write_text(s)

route = root / "apps/web/app/api/publishing/publish/route.ts"
s = route.read_text()
old = '''  const orderedAssets = normalizeAssetManifest(draft.assets, (asset) => {\n    if (!asset) return null;\n    return buildPublicAssetUrl(tenantSlug, asset);\n  });\n\n  const draftOnly = tenant.automationMode === "DRAFT_ONLY";'''
new = '''  const orderedAssets = normalizeAssetManifest(draft.assets, (asset) => {\n    if (!asset) return null;\n    return buildPublicAssetUrl(tenantSlug, asset);\n  });\n  const isYouTube = network === "YOUTUBE";\n  const youtubeThumbnail = isYouTube ? orderedAssets.find((asset) => asset.role === "thumbnail") ?? null : null;\n\n  const draftOnly = tenant.automationMode === "DRAFT_ONLY";'''
if old not in s:
    raise SystemExit("route orderedAssets insertion point missing")
s = s.replace(old, new, 1)
old = '  const primaryAsset = needsAsset ? (draft.assets.find((a) => a.role === "primary") ?? draft.assets[0]) : null;'
new = '  const uploadAssets = isYouTube ? draft.assets.filter((a) => a.role !== "thumbnail") : draft.assets;\n  const primaryAsset = needsAsset ? (uploadAssets.find((a) => a.role === "primary") ?? uploadAssets[0] ?? null) : null;'
if old not in s:
    raise SystemExit("route primaryAsset insertion point missing")
s = s.replace(old, new, 1)
old = '''  const publishInput: PublishInput = {\n    targetId,\n    accessToken,\n    mediaUrl,\n    caption: draft.caption || draft.title,\n    format,\n    mediaType,\n  };\n\n  let publishResult'''
new = '''  const publishInput: PublishInput = {\n    targetId,\n    accessToken,\n    mediaUrl,\n    caption: draft.caption || draft.title,\n    format,\n    mediaType,\n  };\n\n  if (isYouTube) {\n    publishInput.title = draft.title;\n    publishInput.description = draft.caption ?? draft.title;\n    publishInput.thumbnailUrl = youtubeThumbnail?.url ?? null;\n  }\n\n  let publishResult'''
if old not in s:
    raise SystemExit("route publishInput insertion point missing")
s = s.replace(old, new, 1)
old = 'error: "Meta devolvio un resultado ambiguo. Verifique la pagina antes de reintentar.",\n        action: "No vuelva a publicar hasta verificar Facebook. El job permanece IN_REVIEW.",'
new = 'error: `${network} devolvio un resultado ambiguo. Verifique la publicacion antes de reintentar.`,\n        action: `No vuelva a publicar hasta verificar ${network}. El job permanece IN_REVIEW.`,'
if old not in s:
    raise SystemExit("route ambiguous error insertion point missing")
s = s.replace(old, new, 1)
route.write_text(s)

target = root / "apps/web/lib/publishers/__tests__/youtube.test.ts"
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(test_template.read_text())
print("PUB07_PATCH_APPLIED")

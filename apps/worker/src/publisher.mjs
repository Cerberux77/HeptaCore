import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config, loadQueue, saveQueue } from "./config.mjs";
import { checkFacebookReadiness, checkInstagramReadiness } from "./meta-readiness.mjs";

function resolveAsset(entry) {
  const assetPath = entry.selectedAssetPath || "";
  const fullPath = resolve(config.root, assetPath);
  const tenantRelativePath = assetPath.startsWith("content/")
    ? resolve(config.root, "examples", "tenants", config.tenantSlug, assetPath)
    : "";

  if (!existsSync(fullPath)) {
    if (tenantRelativePath && existsSync(tenantRelativePath)) return tenantRelativePath;
    const fallback = resolve(config.paths.inbox, entry.selectedAsset || "");
    if (existsSync(fallback)) return fallback;
    return null;
  }
  return fullPath;
}

async function publishFacebookPost(entry) {
  const asset = resolveAsset(entry);
  if (!asset) {
    return { ok: false, error: `Asset not found: ${entry.selectedAsset}` };
  }

  if (config.dryRun || config.mode === "draft") {
    return {
      ok: true,
      dryRun: true,
      action: "facebook_feed",
      id: entry.id,
      title: entry.title,
      asset,
      scheduledFor: entry.scheduledFor,
    };
  }

  if (config.realPublishConfirmation !== "I_UNDERSTAND_REAL_RRSS_PUBLICATION") {
    return { ok: false, error: "Real publishing blocked: HEPTACORE_ALLOW_REAL_PUBLISH is not confirmed" };
  }

  const token = config.facebook.accessToken;
  const pageId = config.facebook.pageId;

  if (!token || !pageId) {
    return { ok: false, error: "Facebook credentials not configured" };
  }

  const readiness = await checkFacebookReadiness();
  if (!readiness.ok) {
    return { ok: false, error: `Facebook readiness blocked: ${readiness.reason}` };
  }

  try {
    const url = `https://graph.facebook.com/${config.graphVersion}/${pageId}/photos`;
    const form = new FormData();
    form.append("caption", entry.caption);
    form.append("access_token", token);
    form.append("published", "false");

    const fileBuffer = await import("node:fs").then((fs) => fs.readFileSync(asset));
    const blob = new Blob([fileBuffer]);
    form.append("source", blob, entry.selectedAsset);

    const res = await fetch(url, { method: "POST", body: form });
    const data = await res.json();
    if (data.error) {
      return { ok: false, error: data.error.message };
    }
    return { ok: true, action: "facebook_feed", id: entry.id, postId: data.id };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function publishInstagramPost(entry) {
  const asset = resolveAsset(entry);
  if (!asset) {
    return { ok: false, error: `Asset not found: ${entry.selectedAsset}` };
  }

  if (config.dryRun || config.mode === "draft") {
    return {
      ok: true,
      dryRun: true,
      action: `instagram_${entry.format}`,
      id: entry.id,
      title: entry.title,
      asset,
      scheduledFor: entry.scheduledFor,
    };
  }

  if (config.realPublishConfirmation !== "I_UNDERSTAND_REAL_RRSS_PUBLICATION") {
    return { ok: false, error: "Real publishing blocked: HEPTACORE_ALLOW_REAL_PUBLISH is not confirmed" };
  }

  const token = config.instagram.accessToken;
  const igId = config.instagram.businessAccountId;

  if (!token || !igId) {
    return { ok: false, error: "Instagram credentials not configured" };
  }

  const readiness = await checkInstagramReadiness();
  if (!readiness.ok) {
    return { ok: false, error: `Instagram readiness blocked: ${readiness.reason}` };
  }

  try {
    const isVideo = entry.format === "reel";
    const mediaType = isVideo ? "REELS" : "IMAGE";
    const endpoint = `https://graph.instagram.com/${config.graphVersion}/${igId}/media`;

    const createParams = new URLSearchParams({
      caption: entry.caption,
      access_token: token,
      media_type: mediaType,
    });

    if (isVideo) {
      createParams.append("video_url", `file://${asset}`);
    } else {
      createParams.append("image_url", `file://${asset}`);
    }

    const createRes = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: createParams,
    });
    const createData = await createRes.json();

    if (createData.error) {
      return { ok: false, error: createData.error.message };
    }

    const publishRes = await fetch(
      `https://graph.instagram.com/${config.graphVersion}/${igId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          creation_id: createData.id,
          access_token: token,
        }),
      }
    );
    const publishData = await publishRes.json();

    if (publishData.error) {
      return { ok: false, error: publishData.error.message };
    }

    return { ok: true, action: `instagram_${entry.format}`, id: entry.id, mediaId: publishData.id };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function publishStory(entry) {
  const asset = resolveAsset(entry);
  if (!asset) {
    return { ok: false, error: `Asset not found: ${entry.selectedAsset}` };
  }

  if (config.dryRun || config.mode === "draft") {
    return {
      ok: true,
      dryRun: true,
      action: "instagram_story",
      id: entry.id,
      title: entry.title,
      asset,
      scheduledFor: entry.scheduledFor,
    };
  }

  if (config.realPublishConfirmation !== "I_UNDERSTAND_REAL_RRSS_PUBLICATION") {
    return { ok: false, error: "Real publishing blocked: HEPTACORE_ALLOW_REAL_PUBLISH is not confirmed" };
  }

  return { ok: false, error: "Story publishing via API requires content_publish_limit approval. Use Meta Business Suite manual flow." };
}

export async function publishEntry(entry) {
  const start = Date.now();

  let result;
  if (entry.channel === "facebook") {
    result = await publishFacebookPost(entry);
  } else if (entry.format === "story") {
    result = await publishStory(entry);
  } else {
    result = await publishInstagramPost(entry);
  }

  result.durationMs = Date.now() - start;
  return result;
}

export async function publishQueue(dateStr) {
  const queue = loadQueue();
  const results = [];
  let published = 0;
  let failed = 0;

  for (const entry of queue) {
    if (entry.status === "published") continue;
    if (!config.dryRun && !["approved", "scheduled"].includes(entry.status)) continue;
    if (entry.scheduledFor !== dateStr) continue;

    console.log(`\n[${entry.id}] ${entry.channel}/${entry.format} — "${entry.title}"`);

    const result = await publishEntry(entry);
    results.push({ id: entry.id, ...result });

    if (result.ok) {
      entry.status = "ready";
      entry.publishedAt = new Date().toISOString();
      published++;
      console.log(`  ✅ ${result.dryRun ? "[DRY RUN] " : ""}Publicado`);
    } else {
      entry.status = "failed";
      entry.lastError = result.error;
      failed++;
      console.log(`  ❌ Error: ${result.error}`);
    }
  }

  saveQueue(queue);

  return {
    date: dateStr,
    total: results.length,
    published,
    failed,
    results,
  };
}

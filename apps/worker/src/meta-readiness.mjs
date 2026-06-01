import { fileURLToPath } from "node:url";
import { config } from "./config.mjs";

function mask(value) {
  if (!value) return "missing";
  if (value.length <= 10) return "configured";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

async function graphGet(path, params = {}) {
  const url = new URL(`https://graph.facebook.com/${config.graphVersion}/${path.replace(/^\//, "")}`);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }

  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok || data.error) {
    return {
      ok: false,
      status: response.status,
      error: data.error?.message || response.statusText,
      code: data.error?.code,
      type: data.error?.type
    };
  }

  return { ok: true, data };
}

async function run() {
  console.log("\n=== Meta OAuth Readiness ===");
  console.log(`Tenant: ${config.tenantSlug}`);
  console.log(`Graph version: ${config.graphVersion}`);
  console.log(`Dry-run: ${config.dryRun}`);
  console.log(`Facebook page id: ${config.facebook.pageId || "missing"}`);
  console.log(`Facebook page token: ${mask(config.facebook.accessToken)}`);
  console.log(`Instagram business id: ${config.instagram.businessAccountId || "missing"}`);

  const warnings = config.validate();
  if (warnings.length > 0) {
    console.log("\nConfig warnings:");
    warnings.forEach((warning) => console.log(`- ${warning}`));
  }

  const checks = [];

  if (config.facebook.accessToken) {
    checks.push({
      name: "Token identity",
      result: await graphGet("me", {
        fields: "id,name",
        access_token: config.facebook.accessToken
      })
    });
  }

  if (config.facebook.pageId && config.facebook.accessToken) {
    checks.push({
      name: "Facebook Page access",
      result: await graphGet(config.facebook.pageId, {
        fields: "id,name,tasks,instagram_business_account{id,username}",
        access_token: config.facebook.accessToken
      })
    });
  }

  if (config.instagram.businessAccountId && config.facebook.accessToken) {
    checks.push({
      name: "Instagram Business account access",
      result: await graphGet(config.instagram.businessAccountId, {
        fields: "id,username,name,media_count",
        access_token: config.facebook.accessToken
      })
    });
  }

  console.log("\nChecks:");
  for (const check of checks) {
    if (check.result.ok) {
      const data = check.result.data;
      const summary = [data.id, data.name || data.username].filter(Boolean).join(" / ");
      console.log(`OK  ${check.name}${summary ? `: ${summary}` : ""}`);
      continue;
    }

    console.log(`ERR ${check.name}: ${check.result.error}`);
  }

  const failed = checks.filter((check) => !check.result.ok);
  const ready = warnings.length === 0 && failed.length === 0;

  console.log("\nResult:");
  console.log(ready ? "READY for gated publish implementation." : "NOT READY. Resolve warnings/errors before real publishing.");
  process.exit(ready ? 0 : 1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    console.error(error?.message || error);
    process.exit(1);
  });
}

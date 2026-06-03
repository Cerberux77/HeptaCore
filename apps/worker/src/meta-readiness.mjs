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

function readyStatus(summary) {
  return {
    ok: true,
    status: "READY",
    summary
  };
}

function blockedStatus(reason) {
  return {
    ok: false,
    status: "BLOCKED",
    reason
  };
}

export async function checkFacebookReadiness() {
  if (!config.facebook.pageId) {
    return blockedStatus("FACEBOOK_PAGE_ID not configured");
  }

  if (!config.facebook.accessToken) {
    return blockedStatus("FACEBOOK_PAGE_ACCESS_TOKEN not configured");
  }

  const identity = await graphGet("me", {
    fields: "id,name",
    access_token: config.facebook.accessToken
  });

  if (!identity.ok) {
    return {
      ...blockedStatus(`Token identity failed: ${identity.error}`),
      checks: [{ name: "Token identity", result: identity }]
    };
  }

  const page = await graphGet(config.facebook.pageId, {
    fields: "id,name",
    access_token: config.facebook.accessToken
  });

  const checks = [
    { name: "Token identity", result: identity },
    { name: "Facebook Page access", result: page }
  ];

  if (!page.ok) {
    return {
      ...blockedStatus(`Facebook Page access failed: ${page.error}`),
      checks
    };
  }

  if (identity.data.id !== config.facebook.pageId) {
    return {
      ...blockedStatus("Token identity did not return the configured Facebook Page"),
      checks
    };
  }

  return {
    ...readyStatus(`${page.data.id} / ${page.data.name}`),
    checks
  };
}

export async function checkInstagramReadiness() {
  if (!config.instagram.businessAccountId || !config.instagram.accessToken) {
    return blockedStatus("permission flow not configured");
  }

  const account = await graphGet(config.instagram.businessAccountId, {
    fields: "id,username,name,media_count",
    access_token: config.instagram.accessToken
  });

  if (!account.ok) {
    return {
      ...blockedStatus(`Instagram account access failed: ${account.error}`),
      checks: [{ name: "Instagram Business account access", result: account }]
    };
  }

  const name = account.data.name || account.data.username;
  return {
    ...readyStatus([account.data.id, name].filter(Boolean).join(" / ")),
    checks: [{ name: "Instagram Business account access", result: account }]
  };
}

export async function getMetaReadiness() {
  const facebook = await checkFacebookReadiness();
  const instagram = await checkInstagramReadiness();
  const globalStatus = facebook.ok && (instagram.ok || !config.requireInstagram)
    ? (instagram.ok ? "READY" : "READY_FOR_FACEBOOK_ONLY")
    : "BLOCKED";

  return {
    facebook,
    instagram,
    global: {
      ok: globalStatus !== "BLOCKED",
      status: globalStatus
    }
  };
}

function printChecks(checks = []) {
  for (const check of checks) {
    if (check.result.ok) {
      const data = check.result.data;
      const summary = [data.id, data.name || data.username].filter(Boolean).join(" / ");
      console.log(`OK  ${check.name}${summary ? `: ${summary}` : ""}`);
      continue;
    }

    console.log(`ERR ${check.name}: ${check.result.error}`);
  }
}

async function run() {
  console.log("\n=== Meta OAuth Readiness ===");
  console.log(`Tenant: ${config.tenantSlug}`);
  console.log(`Graph version: ${config.graphVersion}`);
  console.log(`Dry-run: ${config.dryRun}`);
  console.log(`Require Instagram: ${config.requireInstagram}`);
  console.log(`Facebook page id: ${config.facebook.pageId || "missing"}`);
  console.log(`Facebook page token: ${mask(config.facebook.accessToken)}`);
  console.log(`Instagram business id: ${config.instagram.businessAccountId || "missing"}`);
  console.log(`Instagram token: ${mask(config.instagram.accessToken)}`);

  const warnings = config.validate();
  if (warnings.length > 0) {
    console.log("\nConfig warnings:");
    warnings.forEach((warning) => console.log(`- ${warning}`));
  }

  const readiness = await getMetaReadiness();

  console.log("\nChecks:");
  printChecks(readiness.facebook.checks);
  printChecks(readiness.instagram.checks);

  console.log("\nResult:");
  console.log(`Facebook: ${readiness.facebook.status}${readiness.facebook.reason ? ` / ${readiness.facebook.reason}` : ""}`);
  console.log(`Instagram: ${readiness.instagram.status}${readiness.instagram.reason ? ` / ${readiness.instagram.reason}` : ""}`);
  console.log(`Global: ${readiness.global.status}`);

  process.exitCode = readiness.global.ok ? 0 : 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    console.error(error?.message || error);
    process.exit(1);
  });
}

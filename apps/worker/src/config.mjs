import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKER_ROOT = resolve(__dirname, "..");
const MONOREPO_ROOT = resolve(WORKER_ROOT, "..", "..");

function loadEnv() {
  const envPath = resolve(MONOREPO_ROOT, ".env.rrss");
  if (!existsSync(envPath)) {
    console.warn("[config] .env.rrss no encontrado. Usando solo variables de entorno del sistema.");
    return;
  }

  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const rawValue = trimmed.slice(eq + 1).trim();
    const value = rawValue.replace(/^(['"])(.*)\1$/, "$2");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const tenantSlug = process.env.HEPTACORE_TENANT_SLUG || "turpial";
const tenantContentRoot = resolve(MONOREPO_ROOT, "examples", "tenants", tenantSlug, "content");

export const config = {
  root: MONOREPO_ROOT,
  workerRoot: WORKER_ROOT,
  tenantSlug,

  mode: process.env.BOT_MODE || "draft",
  dryRun: process.env.BOT_DRY_RUN !== "false",
  graphVersion: process.env.META_GRAPH_VERSION || "v19.0",
  requireInstagram: process.env.META_REQUIRE_INSTAGRAM === "true",
  realPublishConfirmation: process.env.HEPTACORE_ALLOW_REAL_PUBLISH || "",

  publishIntervalMinutes: parseInt(process.env.PUBLISH_INTERVAL_MINUTES || "360", 10),

  facebook: {
    pageId: process.env.FACEBOOK_PAGE_ID || "",
    accessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN || "",
    appId: process.env.FACEBOOK_APP_ID || "",
    appSecret: process.env.FACEBOOK_APP_SECRET || ""
  },

  instagram: {
    businessAccountId: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || "",
    accessToken: process.env.INSTAGRAM_ACCESS_TOKEN || ""
  },

  whatsapp: {
    businessNumber: process.env.WHATSAPP_BUSINESS_NUMBER || ""
  },

  paths: {
    inbox: resolve(tenantContentRoot, "inbox"),
    drafts: resolve(tenantContentRoot, "drafts"),
    queue: resolve(tenantContentRoot, "queue"),
    reports: resolve(tenantContentRoot, "reports"),
    logs: resolve(MONOREPO_ROOT, "logs")
  },

  queueFile: resolve(tenantContentRoot, "queue", "publication-queue.json"),

  validate() {
    const warnings = [];
    if (!this.facebook.accessToken) warnings.push("FACEBOOK_PAGE_ACCESS_TOKEN no configurado");
    if (!this.facebook.pageId) warnings.push("FACEBOOK_PAGE_ID no configurado");
    if (this.requireInstagram && !this.instagram.businessAccountId) {
      warnings.push("INSTAGRAM_BUSINESS_ACCOUNT_ID no configurado");
    }
    if (this.requireInstagram && !this.instagram.accessToken) {
      warnings.push("INSTAGRAM_ACCESS_TOKEN no configurado");
    }
    if (!this.dryRun && this.realPublishConfirmation !== "I_UNDERSTAND_REAL_RRSS_PUBLICATION") {
      warnings.push("HEPTACORE_ALLOW_REAL_PUBLISH no confirma publicacion real");
    }
    return warnings;
  }
};

export function loadQueue() {
  if (!existsSync(config.queueFile)) {
    throw new Error(`Queue file not found: ${config.queueFile}`);
  }
  return JSON.parse(readFileSync(config.queueFile, "utf-8"));
}

export function saveQueue(queue) {
  mkdirSync(dirname(config.queueFile), { recursive: true });
  writeFileSync(config.queueFile, JSON.stringify(queue, null, 2), "utf-8");
}

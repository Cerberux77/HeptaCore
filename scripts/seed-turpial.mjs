import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(__dirname, "..");
const TURPIAL = join(ROOT, "examples", "tenants", "turpial", "content");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TENANT_SLUG = "turpial-sound";
const CHANNEL_MAP = { instagram: "INSTAGRAM", facebook: "FACEBOOK" };
const FORMAT_MAP = {
  feed: "feed", reel: "reel", story: "story", carousel: "carousel"
};

function cuid() {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

const tenant = await prisma.tenant.findFirst({ where: { slug: TENANT_SLUG } });
if (!tenant) throw new Error(`Tenant ${TENANT_SLUG} not found`);

// 1. Find or create Project
let project = await prisma.project.findFirst({ where: { tenantId: tenant.id, name: "Turpial Sound" } });
if (!project) {
  project = await prisma.project.create({
    data: {
      id: cuid(),
      tenantId: tenant.id,
      name: "Turpial Sound",
      description: "Estudio de grabacion, produccion musical, salas de ensayo y marketplace en Caracas",
      onboardingDone: true,
    },
  });
}
console.log(`Project: ${project.id}`);

// 2. Get existing social accounts
const accounts = await prisma.socialAccount.findMany({ where: { tenantId: tenant.id } });
const accountByNetwork = {};
for (const a of accounts) {
  if (!accountByNetwork[a.network]) accountByNetwork[a.network] = a;
}
console.log(`Social accounts: ${Object.keys(accountByNetwork).join(", ")}`);

// 3. Create ContentPillars from queue data pillars
const pillarSet = new Set();
const queue = JSON.parse(readFileSync(join(TURPIAL, "queue", "publication-queue.json"), "utf8"));
for (const item of queue) {
  if (item.pilar) pillarSet.add(item.pilar);
}

const pillarMap = {};
for (const name of pillarSet) {
  const existing = await prisma.contentPillar.findFirst({ where: { tenantId: tenant.id, name } });
  if (existing) {
    pillarMap[name] = existing;
  } else {
    const p = await prisma.contentPillar.create({
      data: { id: cuid(), tenantId: tenant.id, name, description: null, priority: 0, updatedAt: new Date() },
    });
    pillarMap[name] = p;
  }
}
console.log(`ContentPillars: ${Object.keys(pillarMap).length}`);

// 4. Create Assets from all inbox files
const assetMap = {};
const INBOX = join(TURPIAL, "inbox");
const mimeMap = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".mp4": "video/mp4", ".gif": "image/gif",
};
const kindMap = {
  ".jpg": "IMAGE", ".jpeg": "IMAGE", ".png": "IMAGE",
  ".webp": "IMAGE", ".mp4": "VIDEO", ".gif": "IMAGE",
};

function walkDir(dir, prefix = "") {
  const entries = [];
  if (!existsSync(dir)) return entries;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, name.name);
    const rel = prefix ? `${prefix}/${name.name}` : name.name;
    if (name.isDirectory()) {
      entries.push(...walkDir(full, rel));
    } else {
      entries.push({ path: full, rel, name: name.name });
    }
  }
  return entries;
}

const files = walkDir(INBOX);
for (const f of files) {
  const ext = extname(f.name).toLowerCase();
  const kind = kindMap[ext] || "IMAGE";
  const mime = mimeMap[ext] || "application/octet-stream";

  let asset = await prisma.asset.findFirst({ where: { tenantId: tenant.id, filename: f.name } });
  if (!asset) {
    asset = await prisma.asset.create({
      data: {
        id: cuid(),
        tenantId: tenant.id,
        projectId: project.id,
        kind,
        filename: f.name,
        sourcePath: f.rel,
        mimeType: mime,
        rightsStatus: "needs_review",
      },
    });
  }
  assetMap[f.rel] = asset;
}
console.log(`Assets: ${Object.keys(assetMap).length}`);

// 5. Create ContentDrafts from queue
let draftCount = 0;
for (const item of queue) {
  const channel = CHANNEL_MAP[item.channel] || "INSTAGRAM";
  const networkAccount = accountByNetwork[channel];
  const pillar = item.pilar ? pillarMap[item.pilar] : null;
  const status = item.status === "published" ? "PUBLISHED" : "DRAFT";

  const draft = await prisma.contentDraft.create({
    data: {
      id: cuid(),
      tenantId: tenant.id,
      projectId: project.id,
      socialAccountId: networkAccount?.id || null,
      network: channel,
      format: FORMAT_MAP[item.format] || item.format,
      title: item.title,
      caption: item.caption,
      hashtags: item.hashtags || [],
      cta: item.cta || null,
      pillar: item.pilar || null,
      status,
      riskLevel: item.riskLevel || "low",
      requiresReview: item.requiresHumanReview ?? true,
      source: item.sourceDoc || null,
      scheduledFor: item.scheduledFor ? new Date(item.scheduledFor) : null,
      publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
    },
  });

  function relPath(qPath) {
    return qPath ? qPath.replace(/^content\/inbox\//, "") : null;
  }

  // Link primary asset
  const primaryRel = relPath(item.selectedAssetPath);
  if (primaryRel && assetMap[primaryRel]) {
    await prisma.contentDraftAsset.create({
      data: {
        id: cuid(),
        draftId: draft.id,
        assetId: assetMap[primaryRel].id,
        role: "primary",
      },
    });
  }

  // Link carousel assets
  if (item.carouselAssets) {
    for (const carPath of item.carouselAssets) {
      const carRel = relPath(carPath);
      if (carRel && assetMap[carRel]) {
        await prisma.contentDraftAsset.create({
          data: {
            id: cuid(),
            draftId: draft.id,
            assetId: assetMap[carRel].id,
            role: "carousel",
          },
        });
      }
    }
  }

  draftCount++;
}
console.log(`ContentDrafts: ${draftCount}`);

await prisma.$disconnect();
await pool.end();
console.log("\n[DONE] Turpial seed complete.");

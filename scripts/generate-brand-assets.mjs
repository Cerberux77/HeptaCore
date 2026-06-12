import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const REPO_ROOT = join(__dirname, "..");
const BRAND_DIR = join(REPO_ROOT, "apps", "web", "public", "brand");
const ICON_SRC = join(BRAND_DIR, "heptacore-icon.svg");
const LOGO_SRC = join(BRAND_DIR, "heptacore-logo-horizontal.svg");
const BACKUP_DIR = join(BRAND_DIR, "backups");

function backupFile(srcPath) {
  if (!existsSync(srcPath)) return null;
  if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const name = srcPath.split(/[/\\]/).pop();
  const backupPath = join(BACKUP_DIR, `${ts}_${name}`);
  writeFileSync(backupPath, readFileSync(srcPath));
  console.log(`  Backup: ${backupPath}`);
  return backupPath;
}

async function svgToPng(svgPath, width, height, options = {}) {
  const svgBuffer = readFileSync(svgPath);
  let pipeline = sharp(svgBuffer).resize(width, height, { fit: "inside", withoutEnlargement: false });
  if (options.background) {
    pipeline = pipeline.flatten({ background: options.background });
  }
  return pipeline.png().toBuffer();
}

async function generateIconPngs() {
  console.log("\n[1/4] Generating icon PNGs...");
  const sizes = [1024, 512, 192, 180, 48, 32, 16];
  for (const size of sizes) {
    const buf = await svgToPng(ICON_SRC, size, size);
    let name;
    if (size === 1024) name = "heptacore-icon-1024.png";
    else if (size === 512) name = "heptacore-icon-512.png";
    else if (size === 192) name = "android-chrome-192x192.png";
    else if (size === 180) name = "apple-touch-icon.png";
    else if (size === 48) name = "favicon-48x48.png";
    else if (size === 32) name = "favicon-32x32.png";
    else if (size === 16) name = "favicon-16x16.png";
    else name = `heptacore-icon-${size}.png`;
    const outPath = join(BRAND_DIR, name);
    writeFileSync(outPath, buf);
    console.log(`  Wrote: ${name} (${size}x${size})`);
  }
}

async function generateLogoPngs() {
  console.log("\n[2/4] Generating horizontal logo PNGs...");
  const variants = [
    { width: 1200, name: "heptacore-logo-horizontal-1200.png" },
    { width: 600, name: "heptacore-logo-horizontal-600.png" },
  ];
  for (const v of variants) {
    const buf = await svgToPng(LOGO_SRC, v.width, null);
    const outPath = join(BRAND_DIR, v.name);
    writeFileSync(outPath, buf);
    const meta = await sharp(buf).metadata();
    console.log(`  Wrote: ${v.name} (${meta.width}x${meta.height})`);
  }
}

async function generateOgImage() {
  console.log("\n[3/4] Generating Open Graph image...");
  const logoBuf = await svgToPng(LOGO_SRC, 1000, null);
  const logoMeta = await sharp(logoBuf).metadata();
  const ogW = 1200;
  const ogH = 630;
  const logoW = logoMeta.width;
  const logoH = logoMeta.height;
  const left = Math.round((ogW - logoW) / 2);
  const top = Math.round((ogH - logoH) / 2);
  const canvas = await sharp({
    create: { width: ogW, height: ogH, channels: 3, background: { r: 0xF6, g: 0xF6, b: 0xF7 } },
  })
    .composite([{ input: logoBuf, left, top }])
    .png()
    .toBuffer();
  const outPath = join(BRAND_DIR, "og-image-1200x630.png");
  writeFileSync(outPath, canvas);
  console.log(`  Wrote: og-image-1200x630.png (${ogW}x${ogH})`);
}

async function generateFaviconIco() {
  console.log("\n[4/4] Generating favicon.ico...");
  let pngToIco;
  try {
    pngToIco = (await import("png-to-ico")).default || (await import("png-to-ico"));
  } catch {
    console.log("  png-to-ico not found, installing as dev dependency...");
    const { execSync } = await import("node:child_process");
    execSync("npm install --save-dev png-to-ico", { cwd: REPO_ROOT, stdio: "inherit" });
    pngToIco = (await import("png-to-ico")).default || (await import("png-to-ico"));
  }

  const sizes = [16, 32, 48];
  const pngs = [];
  for (const size of sizes) {
    const buf = await svgToPng(ICON_SRC, size, size, { background: "#0a0a0a" });
    pngs.push(buf);
  }

  const icoBuf = await pngToIco(pngs);
  const outPath = join(BRAND_DIR, "favicon.ico");
  writeFileSync(outPath, icoBuf);
  console.log(`  Wrote: favicon.ico (16x16, 32x32, 48x48)`);
}

// ─── MAIN ──────────────────────────────────────────────────────────

async function main() {
  console.log("=== HeptaCore Brand Asset Generator ===\n");

  // Verify sources
  if (!existsSync(ICON_SRC)) throw new Error(`Missing: ${ICON_SRC}`);
  if (!existsSync(LOGO_SRC)) throw new Error(`Missing: ${LOGO_SRC}`);
  console.log("Source SVGs found.");

  // Backup existing files in brand/ (NOT the SVG masters, just backup any existing PNGs/ICOs)
  const existing = ["heptacore-icon-1024.png", "heptacore-icon-512.png",
    "android-chrome-192x192.png", "android-chrome-512x512.png",
    "apple-touch-icon.png", "favicon-48x48.png", "favicon-32x32.png",
    "favicon-16x16.png", "og-image-1200x630.png", "favicon.ico",
    "heptacore-logo-horizontal-1200.png", "heptacore-logo-horizontal-600.png"];
  for (const f of existing) {
    const p = join(BRAND_DIR, f);
    if (existsSync(p)) backupFile(p);
  }

  await generateIconPngs();
  await generateLogoPngs();
  await generateOgImage();
  await generateFaviconIco();

  // Also generate android-chrome-512x512.png (same as 512 icon but named specifically)
  const icon512 = join(BRAND_DIR, "heptacore-icon-512.png");
  const android512 = join(BRAND_DIR, "android-chrome-512x512.png");
  if (existsSync(icon512)) {
    writeFileSync(android512, readFileSync(icon512));
    console.log(`  Copied: android-chrome-512x512.png`);
  }

  console.log("\n=== Generation complete ===");
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});

/**
 * HeptaCore — Fix Asset Links
 *
 * Repara rutas de assets en la base de datos que apuntan a paths legacy.
 * Convert paths from old content/inbox/ format to the expected tenant-assets format.
 *
 * Uso: node scripts/fix-asset-links.mjs
 *      node scripts/fix-asset-links.mjs --dry-run
 */

import { PrismaClient } from "@prisma/client";
import pg from "pg";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

const dryRun = process.argv.includes("--dry-run");

function loadEnv() {
  try {
    const fs = await import("fs");
    const dotenv = await import("dotenv");
    const envPath = resolve(projectRoot, ".env");
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }
    const localPath = resolve(projectRoot, ".env.production.local");
    if (fs.existsSync(localPath)) {
      const content = fs.readFileSync(localPath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  } catch {
    // load what we can, skip missing files
  }
}

async function main() {
  await loadEnv();

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set. Set it in .env or .env.production.local");
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new (await import("@prisma/adapter-pg")).PrismaPg(pool) });

  console.log(`🔍 Buscando assets con rutas legacy... (dry-run: ${dryRun})`);

  const assets = await prisma.asset.findMany({
    where: {
      sourcePath: { startsWith: "content/inbox/" },
    },
    select: { id: true, filename: true, sourcePath: true },
  });

  console.log(`📦 Encontrados ${assets.length} assets con rutas legacy.`);

  if (assets.length === 0) {
    console.log("✅ No hay rutas legacy que reparar.");
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  for (const asset of assets) {
    const oldPath = asset.sourcePath;
    const newPath = oldPath.replace(/^content\/inbox\//, "");
    console.log(`  ${asset.filename}: ${oldPath} → ${newPath}`);

    if (!dryRun) {
      await prisma.asset.update({
        where: { id: asset.id },
        data: { sourcePath: newPath },
      });
    }
  }

  if (dryRun) {
    console.log("🏁 Dry-run completado. Usa sin --dry-run para aplicar cambios.");
  } else {
    console.log("✅ Assets actualizados correctamente.");
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

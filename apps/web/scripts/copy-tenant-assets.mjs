import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(__dirname, "..");
const repoRoot = resolve(webRoot, "..", "..");
const source = resolve(repoRoot, "examples", "tenants", "turpial", "content", "inbox");
const target = resolve(webRoot, "public", "tenant-assets", "turpial");

if (!existsSync(source)) {
  console.warn(`[copy-tenant-assets] Source not found: ${source}`);
  process.exit(0);
}

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(source, target, { recursive: true });
console.log(`[copy-tenant-assets] Turpial assets copied to ${target}`);

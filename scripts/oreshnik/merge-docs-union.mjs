#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getArg, hasFlag, ROOT, RUNS_DIR } from "./lib.mjs";

const baseRef = getArg("--base");
const sourceRef = getArg("--source");
const shouldStage = hasFlag("--stage");

if (!baseRef || !sourceRef) {
  console.error("Usage: node scripts/oreshnik/merge-docs-union.mjs --base <ref> --source <ref> [--stage]");
  process.exit(2);
}

function git(args, allowFail = false) {
  const result = spawnSync("git", args, { cwd: ROOT, encoding: "utf8" });
  if (result.status !== 0 && !allowFail) throw new Error(result.stderr || result.stdout);
  return { ok: result.status === 0, output: result.stdout || "" };
}

function readRef(ref, file) {
  const result = git(["show", `${ref}:${file}`], true);
  return result.ok ? result.output : null;
}

function readWorking(file) {
  const path = join(ROOT, ...file.split("/"));
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

function writeWorking(file, content) {
  const path = join(ROOT, ...file.split("/"));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

function removeWorking(file) {
  const path = join(ROOT, ...file.split("/"));
  if (existsSync(path)) unlinkSync(path);
}

function same(a, b) {
  return String(a ?? "") === String(b ?? "");
}

function mergeJson(baseContent, currentContent, sourceContent) {
  try {
    const base = baseContent ? JSON.parse(baseContent) : undefined;
    const current = currentContent ? JSON.parse(currentContent) : undefined;
    const source = sourceContent ? JSON.parse(sourceContent) : undefined;
    const merged = mergeValue(base, current, source);
    return `${JSON.stringify(merged, null, 2)}\n`;
  } catch {
    return null;
  }
}

function key(value) {
  return JSON.stringify(value);
}

function mergeValue(base, current, source) {
  if (key(current) === key(source)) return current;
  if (key(current) === key(base)) return source;
  if (key(source) === key(base)) return current;
  if (current && source && typeof current === "object" && typeof source === "object" && !Array.isArray(current) && !Array.isArray(source)) {
    const result = { ...current };
    for (const itemKey of new Set([...Object.keys(base || {}), ...Object.keys(current), ...Object.keys(source)])) {
      result[itemKey] = mergeValue(base?.[itemKey], current[itemKey], source[itemKey]);
    }
    return result;
  }
  if (Array.isArray(current) && Array.isArray(source)) {
    const seen = new Set();
    return [...current, ...source].filter((item) => {
      const itemKey = key(item);
      if (seen.has(itemKey)) return false;
      seen.add(itemKey);
      return true;
    });
  }
  return source;
}

function mergeText(file, baseContent, currentContent, sourceContent) {
  mkdirSync(RUNS_DIR, { recursive: true });
  const id = Buffer.from(file).toString("hex");
  const basePath = join(RUNS_DIR, `.merge-base-${process.pid}-${id}`);
  const currentPath = join(RUNS_DIR, `.merge-current-${process.pid}-${id}`);
  const sourcePath = join(RUNS_DIR, `.merge-source-${process.pid}-${id}`);
  try {
    writeFileSync(basePath, baseContent ?? "");
    writeFileSync(currentPath, currentContent ?? "");
    writeFileSync(sourcePath, sourceContent ?? "");
    return execFileSync("git", ["merge-file", "--union", "-p", currentPath, basePath, sourcePath], {
      cwd: ROOT,
      encoding: "utf8"
    });
  } finally {
    rmSync(basePath, { force: true });
    rmSync(currentPath, { force: true });
    rmSync(sourcePath, { force: true });
  }
}

const diff = git(["diff", "--name-only", `${baseRef}...${sourceRef}`, "--", "docs/obsidian-vault", "docs/07_handoffs", "docs/*.md"], true).output;
const files = diff.split(/\r?\n/).filter(Boolean);
const changed = [];
const warnings = [];

for (const file of files) {
  const base = readRef(baseRef, file);
  const source = readRef(sourceRef, file);
  const current = readWorking(file);

  if (source === null) {
    if (current === null || same(current, base)) {
      removeWorking(file);
      changed.push(file);
    } else {
      warnings.push(`${file}: source deleted but current changed; preserved current`);
    }
    continue;
  }

  if (current === null || same(current, base) || same(current, source)) {
    if (!same(current, source)) {
      writeWorking(file, source);
      changed.push(file);
    }
    continue;
  }

  if (same(source, base)) continue;
  const merged = file.endsWith(".json") ? mergeJson(base, current, source) : null;
  writeWorking(file, merged ?? mergeText(file, base, current, source));
  changed.push(file);
}

if (shouldStage && changed.length > 0) git(["add", "--", ...changed]);
console.log(JSON.stringify({ changed, warnings }, null, 2));

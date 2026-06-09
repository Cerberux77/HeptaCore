#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { currentBranch, getArg, git, log, readMother, ROOT } from "./lib.mjs";

const sprint = getArg("--sprint") || getArg("-s");
const operator = getArg("--operator") || getArg("-o");
const branch = getArg("--branch") || currentBranch();
const zoneMapPath = join(ROOT, "docs", "07_handoffs", "zone-map.json");

if (!sprint) {
  console.error("Usage: node scripts/oreshnik/zone-check.mjs --sprint SXX [--branch branch]");
  process.exit(2);
}

if (!existsSync(zoneMapPath)) {
  log("FAIL", `zone-map.json not found at ${zoneMapPath}`);
  process.exit(1);
}

const zoneMap = JSON.parse(readFileSync(zoneMapPath, "utf8"));
const sprintOwner = zoneMap.sprintOwners?.[sprint];
const mother = readMother().current;
let baseRef = mother;
let motherExists = git(["rev-parse", "--verify", mother], { allowFail: true }).ok;
if (!motherExists) {
  baseRef = git(["rev-parse", "--verify", "master"], { allowFail: true }).ok ? "master" : "HEAD~10";
  log("WARN", `Mother '${mother}' not found. Using ${baseRef} as diff base.`);
}
let changed = git(["diff", "--name-only", `${baseRef}...${branch}`], { allowFail: true }).output;
if (!changed) changed = git(["diff", "--name-only"], { allowFail: true }).output;
const files = changed.split(/\r?\n/).filter(Boolean);

if (files.length === 0) {
  log("OK", `No changed files to check for ${sprint}.`);
  process.exit(0);
}

const collisions = [];
const warnings = [];

function globToRegex(glob) {
  const token = "__DOUBLE_STAR__";
  const escaped = glob
    .replaceAll("**", token)
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replaceAll("*", "[^/]*")
    .replaceAll(token, ".*");
  return new RegExp(`^${escaped}$`);
}

for (const file of files) {
  let matched = false;
  for (const [pattern, zone] of Object.entries(zoneMap.zones)) {
    if (!globToRegex(pattern).test(file)) continue;
    matched = true;
    const allowed = zone.sprints?.includes("*") || zone.sprints?.includes(sprint);
    if (zone.lock === "forbidden") collisions.push(`${file}: forbidden zone (${pattern})`);
    else if (zone.lock === "jean_exclusive" && operator !== "Jean") collisions.push(`${file}: Jean exclusive zone (${pattern}) — este sprint es de ${sprintOwner || "Jean"}, pero el operador es ${operator || "desconocido"}`);
    else if (zone.lock === "manuel_exclusive" && operator !== "Manuel") collisions.push(`${file}: Manuel exclusive zone (${pattern}) — este sprint es de ${sprintOwner || "Manuel"}, pero el operador es ${operator || "desconocido"}`);
    else if (zone.lock === "double_jean_manuel") warnings.push(`${file}: double lock required (${pattern})`);
    else if (!allowed) warnings.push(`${file}: not explicitly mapped to ${sprint} (${pattern})`);
    break;
  }
  if (!matched) warnings.push(`${file}: no zone-map entry`);
}

warnings.forEach((item) => log("WARN", item));
collisions.forEach((item) => log("FAIL", item));

if (collisions.length > 0) process.exit(1);
log("OK", `Zone check passed for ${sprint}: ${files.length} file(s), ${warnings.length} warning(s).`);

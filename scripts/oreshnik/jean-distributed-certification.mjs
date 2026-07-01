#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd, exit } from "node:process";

const root = cwd();
const checks = [];

function pass(id, details = "") {
  checks.push({ id, passed: true, details });
}

function fail(id, details) {
  checks.push({ id, passed: false, details });
}

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function includes(rel, needle, id) {
  const text = read(rel);
  if (text.includes(needle)) pass(id, rel);
  else fail(id, `${rel} missing ${needle}`);
}

const config = JSON.parse(read(".oreshnik.json"));
const operators = new Map((config.operators ?? []).map((operator) => [operator.id, operator]));

for (const id of ["manuel", "jean", "codex", "kilo"]) {
  const operator = operators.get(id);
  if (operator) pass(`operator:${id}`, operator.status ?? "unknown");
  else fail(`operator:${id}`, "missing from .oreshnik.json");
}

includes(".gitignore", "var/oreshnik/operator.local.json", "operator-local-gitignored");

const canonicalKilo = ".kilo/commands/goal.md";
const legacyKilo = ".kilo/command/goal.md";
if (!existsSync(join(root, canonicalKilo))) fail("kilo-canonical-adapter", "missing .kilo/commands/goal.md");
else pass("kilo-canonical-adapter", canonicalKilo);

if (!existsSync(join(root, legacyKilo))) fail("kilo-legacy-adapter", "missing .kilo/command/goal.md");
else pass("kilo-legacy-adapter", legacyKilo);

if (existsSync(join(root, canonicalKilo)) && existsSync(join(root, legacyKilo))) {
  const canonical = read(canonicalKilo);
  const legacy = read(legacyKilo);
  if (canonical === legacy) pass("kilo-dual-adapters-identical");
  else fail("kilo-dual-adapters-identical", "canonical and legacy adapter files differ");
  if (canonical.includes("oreshnik goal --harness kilo --json") && !canonical.includes("--operator kilo")) {
    pass("kilo-adapter-no-hardcoded-human");
  } else {
    fail("kilo-adapter-no-hardcoded-human", "adapter must call goal by harness and not hardcode a human operator");
  }
}

if (existsSync(join(root, "docs/operations/jean-distributed-certification.md"))) {
  pass("jean-docs-present", "docs/operations/jean-distributed-certification.md");
} else {
  fail("jean-docs-present", "missing docs/operations/jean-distributed-certification.md");
}

for (const rel of [
  "scripts/oreshnik/onboard-operator.ps1",
  "scripts/oreshnik/verify-operator-ready.ps1",
  "scripts/oreshnik/start-goal.ps1",
  "docs/operators/JEAN-ONBOARDING.md",
  "docs/operators/MULTIOPERATOR-OPERATIONS.md",
]) {
  if (existsSync(join(root, rel))) pass(`required:${rel}`, rel);
  else fail(`required:${rel}`, `missing ${rel}`);
}

const failed = checks.filter((check) => !check.passed);
const result = {
  ready: failed.length === 0,
  verdict: failed.length === 0 ? "READY_TO_PUBLISH_FOR_JEAN" : "NEEDS_FIX",
  checks,
};

console.log(JSON.stringify(result, null, 2));
if (failed.length > 0) exit(1);

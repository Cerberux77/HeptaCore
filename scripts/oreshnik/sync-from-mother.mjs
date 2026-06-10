#!/usr/bin/env node
import { currentBranch, git, log, resolveMother, sh } from "./lib.mjs";

const mother = resolveMother();
const branch = currentBranch();

console.log("");
log("INFO", `Sync docs from mother: ${mother.effective}`);
if (mother.declaredMissing) log("WARN", `Declared mother '${mother.current}' is missing; using '${mother.effective}'.`);
log("INFO", `Current branch: ${branch}`);

git(["fetch", "origin", "--prune", "--quiet"], { allowFail: true });
const motherRef = mother.effectiveRef;
const exists = git(["rev-parse", "--verify", motherRef], { allowFail: true });
if (!exists.ok) {
  log("WARN", `Mother '${mother.effective}' not found. Nothing to sync yet.`);
  process.exit(0);
}

const base = git(["merge-base", "HEAD", motherRef], { allowFail: true }).output || motherRef;
const result = sh(`node scripts/oreshnik/merge-docs-union.mjs --base ${base} --source ${motherRef}`);
console.log(result);
log("OK", "Docs merged from mother without replacing product code.");

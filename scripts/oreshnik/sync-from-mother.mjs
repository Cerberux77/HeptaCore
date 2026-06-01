#!/usr/bin/env node
import { currentBranch, git, log, readMother, sh } from "./lib.mjs";

const mother = readMother().current;
const branch = currentBranch();

console.log("");
log("INFO", `Sync docs from mother: ${mother}`);
log("INFO", `Current branch: ${branch}`);

git(["fetch", "origin", "--prune", "--quiet"], { allowFail: true });
const motherRef = git(["rev-parse", "--verify", `origin/${mother}`], { allowFail: true }).ok ? `origin/${mother}` : mother;
const exists = git(["rev-parse", "--verify", motherRef], { allowFail: true });
if (!exists.ok) {
  log("WARN", `Mother '${mother}' not found. Nothing to sync yet.`);
  process.exit(0);
}

const base = git(["merge-base", "HEAD", motherRef], { allowFail: true }).output || motherRef;
const result = sh(`node scripts/oreshnik/merge-docs-union.mjs --base ${base} --source ${motherRef}`);
console.log(result);
log("OK", "Docs merged from mother without replacing product code.");

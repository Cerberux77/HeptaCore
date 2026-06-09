#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  CENTRAL_DOC,
  EVENTS_DIR,
  VAULT_DIR,
  colors,
  currentBranch,
  getArg,
  git,
  hasFlag,
  log,
  nowVet,
  readMother,
  resolveOperator,
  sanitize,
  writeJson,
  writeMother,
  discoverLatestMother
} from "./lib.mjs";

const sprint = getArg("--sprint");
const operator = resolveOperator(getArg("--operator"));
const desc = getArg("--desc", "cierre");
const push = hasFlag("--push");
const force = hasFlag("--force");

if (!sprint) {
  console.error("Usage: node scripts/oreshnik/close-sprint.mjs --sprint SXX --operator Jean|Manuel --desc \"desc\" [--push] [--force]");
  process.exit(2);
}

const vet = nowVet();
const branch = currentBranch();
const mother = discoverLatestMother();
const newVersion = (mother.version || 1) + 1;
const newMother = `MADRE/v${newVersion}-${sanitize(sprint)}-${sanitize(desc)}-${vet.date}`;

console.log("");
console.log(`${colors.bold}HeptaCore Oreshnik Close Sprint${colors.reset}`);
console.log("");
log("INFO", `Sprint: ${sprint}`);
log("INFO", `Operator: ${operator}`);
log("INFO", `Branch: ${branch}`);
log("INFO", `Current mother: ${mother.current}`);
log("INFO", `Next mother: ${newMother}`);

if (!new RegExp(`^${operator}/`, "i").test(branch) && !force) {
  log("FAIL", `Current branch is not ${operator}/*. Use --force only for exceptional documentation closures.`);
  process.exit(1);
}

const changed = git(["diff", "--name-only"], { allowFail: true }).output.split(/\r?\n/).filter(Boolean);
const staged = git(["diff", "--cached", "--name-only"], { allowFail: true }).output.split(/\r?\n/).filter(Boolean);
const allChanged = [...new Set([...changed, ...staged])];
const secretChanges = allChanged.filter((file) => /^\.env($|\.)/.test(file) && !file.endsWith(".example"));
if (secretChanges.length > 0) {
  secretChanges.forEach((file) => log("FAIL", `Secret-like file changed: ${file}`));
  process.exit(1);
}

updateVaultDocs();

mkdirSync(EVENTS_DIR, { recursive: true });
const eventPath = join(EVENTS_DIR, `${vet.date}_${sprint}_CERRADO.json`);
writeJson(eventPath, {
  sprint,
  operator,
  status: "CERRADO",
  date: vet.date,
  at: vet.iso,
  branch,
  previousMother: mother.current,
  nextMother: newMother,
  description: desc,
  changedFiles: allChanged
});

const nextMotherData = {
  ...mother,
  version: newVersion,
  current: newMother,
  branches: [
    ...(mother.branches || []),
    {
      version: newVersion,
      name: newMother,
      sprint,
      operator,
      date: vet.date,
      at: vet.iso,
      previous: mother.current,
      description: desc
    }
  ]
};
writeMother(nextMotherData);

git(["add", "docs/obsidian-vault", "docs/07_handoffs", "var/oreshnik/.mother-version.json", "var/sprint-events"], { allowFail: false });
const stagedAfter = git(["diff", "--cached", "--name-only"], { allowFail: true }).output;
if (!stagedAfter) {
  log("WARN", "No staged documentation changes.");
} else {
  git(["commit", "-m", `docs(${sanitize(sprint)}): close ${sprint} - ${desc}`], { allowFail: false });
  log("OK", "Closure documentation committed on child branch.");
}

const motherExists = git(["rev-parse", "--verify", mother.current], { allowFail: true }).ok;
if (motherExists) {
  git(["checkout", mother.current], { allowFail: false });
  git(["checkout", "-b", newMother], { allowFail: false });
  const base = git(["merge-base", "HEAD", branch], { allowFail: true }).output || mother.current;
  const merge = git(["diff", "--name-only", `${base}...${branch}`, "--", "docs/obsidian-vault", "docs/07_handoffs"], { allowFail: true }).output;
  if (merge) {
    const result = git(["show", `${branch}:docs/obsidian-vault/00_CENTRAL_HEPTACORE.md`], { allowFail: true });
    if (result.ok) writeFileSafe(CENTRAL_DOC, result.output);
    git(["checkout", branch, "--", "docs/obsidian-vault", "docs/07_handoffs"], { allowFail: true });
  }
  writeMother(nextMotherData);
  writeJson(eventPath, {
    sprint,
    operator,
    status: "CERRADO",
    date: vet.date,
    at: vet.iso,
    branch,
    previousMother: mother.current,
    nextMother: newMother,
    description: desc
  });
  git(["add", "docs/obsidian-vault", "docs/07_handoffs", "var/oreshnik/.mother-version.json", "var/sprint-events"], { allowFail: false });
  if (git(["diff", "--cached", "--name-only"], { allowFail: true }).output) {
    git(["commit", "-m", `docs(mother): integrate ${sprint} - ${operator}`], { allowFail: false });
    log("OK", `Created local mother branch ${newMother}.`);
  }
  if (push) {
    git(["push", "origin", branch], { allowFail: false });
    git(["push", "origin", newMother], { allowFail: false });
    log("OK", "Pushed child branch and mother branch.");
  } else {
    log("WARN", "Push skipped. Re-run with --push when ready.");
  }
  git(["checkout", branch], { allowFail: false });
} else {
  log("WARN", `Mother '${mother.current}' does not exist locally. Recorded closure metadata only.`);
}

console.log("");
console.log(`${colors.green}${colors.bold}SPRINT CLOSED: ${sprint}${colors.reset}`);
console.log(`Mother docs branch: ${newMother}`);
console.log(`Event: ${eventPath}`);

function updateVaultDocs() {
  const central = CENTRAL_DOC;
  if (existsSync(central)) {
    let content = readFileSync(central, "utf8");
    content = replaceOrInsertFrontmatter(content, "last_updated", vet.display);
    content = replaceOrInsertFrontmatter(content, "mother_branch", newMother);
    content = content.replace(/> \*\*Ultima actualizacion:\*\*.*$/m, `> **Ultima actualizacion:** ${vet.display} VET | **Estado:** ${sprint} CERRADO | **Operador:** ${operator}`);
    appendIfMissing(content, central, `\n## Cierre ${sprint} - ${vet.date}\n\n- Operador: ${operator}\n- Rama hija: \`${branch}\`\n- Rama madre docs: \`${newMother}\`\n- Descripcion: ${desc}\n`);
  }

  const plan = join(VAULT_DIR, "SPRINTS", "PLAN_MAESTRO_SPRINTS.md");
  if (existsSync(plan)) {
    let content = readFileSync(plan, "utf8");
    content = replaceOrInsertFrontmatter(content, "last_updated", vet.iso);
    content = replaceOrInsertFrontmatter(content, "mother_branch", newMother);
    content += `\n\n## Cierre ${sprint} - ${vet.date}\n\n| Campo | Valor |\n|---|---|\n| Operador | ${operator} |\n| Rama | \`${branch}\` |\n| Estado | CERRADO |\n| Madre docs | \`${newMother}\` |\n| Descripcion | ${desc} |\n`;
    writeFileSync(plan, content, "utf8");
  }
}

function replaceOrInsertFrontmatter(content, key, value) {
  const line = `${key}: "${value}"`;
  const regex = new RegExp(`^${key}:\\s*".*"$`, "m");
  if (regex.test(content)) return content.replace(regex, line);
  if (content.startsWith("---")) return content.replace("---\n", `---\n${line}\n`);
  return `---\n${line}\n---\n\n${content}`;
}

function appendIfMissing(currentContent, path, addition) {
  const marker = addition.split("\n")[1];
  if (currentContent.includes(marker)) writeFileSync(path, currentContent, "utf8");
  else writeFileSync(path, `${currentContent.trimEnd()}\n${addition}`, "utf8");
}

function writeFileSafe(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

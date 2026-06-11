#!/usr/bin/env node
/**
 * HeptaCore Oreshnik — Obsidian Vault Sync Guard
 *
 * Paso 0 obligatorio antes de operaciones git que toquen docs/obsidian-vault/.
 * Adaptado del script original en TurpialSound (scripts/oreshnik/sync-obsidian.ps1).
 *
 * Estrategia (NO mata Obsidian):
 *   1. Detecta archivos de config de Obsidian modificados (docs/obsidian-vault/.obsidian/)
 *   2. Los restaura desde HEAD: git checkout HEAD -- docs/obsidian-vault/.obsidian/
 *   3. Reporta cambios de contenido en el vault (intencionales del operador) pero NO los revierte
 *   4. Retorna 0 si limpio/restaurado, 1 si hay problemas que requieren atencion manual
 *
 * Esto evita que Obsidian inyecte cambios espurios en .obsidian/workspace.json, etc.
 * durante merges colaborativos no destructivos.
 *
 * Uso: node scripts/oreshnik/obsidian-guard.mjs [--force]
 *      --force: restaura archivos de config automaticamente sin preguntar
 */

import { execSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = new URL(".", import.meta.url).pathname;
const ROOT = join(__dirname, "..", "..");
const OBSIDIAN_CONFIG_DIR = "docs/obsidian-vault/.obsidian";
const VAULT_DIR = "docs/obsidian-vault";

const force = process.argv.includes("--force");
const verbose = process.argv.includes("--verbose");

function log(label, msg) {
  const codes = { PASS: "[ \x1b[32mPASS\x1b[0m ]", FAIL: "[ \x1b[31mFAIL\x1b[0m ]", WARN: "[ \x1b[33mWARN\x1b[0m ]", INFO: "[ \x1b[36mINFO\x1b[0m ]" };
  console.log(`${codes[label] || `[ ${label} ]`} ${msg}`);
}

function git(args, opts = {}) {
  try {
    return execSync(`git ${args}`, {
      cwd: ROOT,
      encoding: "utf8",
      windowsHide: true,
      stdio: opts.stdio || "pipe",
      ...opts
    }).trim();
  } catch (err) {
    if (opts.allowFail) return "";
    throw err;
  }
}

function main() {
  console.log("");
  console.log("==============================================");
  console.log("  ORESHNIK OBSIDIAN GUARD - HeptaCore");
  console.log("==============================================");
  console.log("");

  let allOk = true;

  // 1. Detectar cambios de config de Obsidian (.obsidian/ directory)
  log("INFO", "Detectando cambios de config de Obsidian...");
  const configDirty = git(`diff --name-only -- "${OBSIDIAN_CONFIG_DIR}/"`, { allowFail: true });

  if (configDirty) {
    const files = configDirty.split(/\r?\n/).filter(Boolean);
    log("WARN", `Obsidian modifico ${files.length} archivo(s) de config.`);
    files.forEach((file) => { if (verbose) console.log(`  ${file}`); });
    console.log(`  ${files.map((file) => `  ${file}`).join("\n")}`);

    if (force) {
      log("INFO", "--force activo: restaurando config de Obsidian desde HEAD...");
      try {
        git(`checkout HEAD -- "${OBSIDIAN_CONFIG_DIR}/"`, { stdio: "pipe" });
        log("PASS", "Config de Obsidian restaurada desde HEAD.");
      } catch (err) {
        log("FAIL", `No se pudo restaurar config: ${err.message}`);
        allOk = false;
      }
    } else {
      log("FAIL", "Config de Obsidian modificada. Ejecuta con --force para restaurar automaticamente.");
      log("INFO", "Manual: git checkout HEAD -- docs/obsidian-vault/.obsidian/");
      allOk = false;
    }
  } else {
    log("PASS", "Config de Obsidian limpia (sin modificaciones).");
  }

  // 2. Reportar cambios de contenido en el vault (NO revertir — son intencionales del operador)
  const vaultDirty = git(`diff --name-only -- "${VAULT_DIR}/" -- ":!${OBSIDIAN_CONFIG_DIR}"`, { allowFail: true });

  if (vaultDirty) {
    const files = vaultDirty.split(/\r?\n/).filter(Boolean);
    log("WARN", `Vault tiene ${files.length} archivo(s) de contenido con cambios locales (intencionales del operador).`);
    console.log(`${files.map((file) => `  ${file}`).join("\n")}`);
    log("INFO", "Estos cambios de contenido NO se revierten. Son trabajo intencional del operador.");
    log("INFO", "Si NO son intencionales, ejecuta: git checkout HEAD -- docs/obsidian-vault/");
  } else {
    log("PASS", "Vault de contenido limpio (sin cambios).");
  }

  // 3. Verificar si hay archivos unstaged en el vault que puedan causar conflictos
  const unstaged = git(`diff --name-only -- "${VAULT_DIR}/"`, { allowFail: true });
  const staged = git(`diff --cached --name-only -- "${VAULT_DIR}/"`, { allowFail: true });

  if (unstaged && staged) {
    const unstagedFiles = unstaged.split(/\r?\n/).filter(Boolean);
    const stagedFiles = staged.split(/\r?\n/).filter(Boolean);
    const both = unstagedFiles.filter((file) => stagedFiles.includes(file));
    if (both.length > 0) {
      log("WARN", `${both.length} archivo(s) tienen cambios staged y unstaged. Posible conflicto.`);
      console.log(`${both.map((file) => `  ${file}`).join("\n")}`);
    }
  }

  // 4. Verificar untracked files en .obsidian/
  const untracked = git(`ls-files --others --exclude-standard -- "${OBSIDIAN_CONFIG_DIR}/"`, { allowFail: true });
  if (untracked) {
    const files = untracked.split(/\r?\n/).filter(Boolean);
    log("WARN", `${files.length} archivo(s) untracked en .obsidian/.`);
    if (verbose) console.log(`${files.map((file) => `  ${file}`).join("\n")}`);
    log("INFO", "Archivos untracked en .obsidian/ no causan conflictos pero pueden indicar plugins nuevos.");
  }

  console.log("");
  console.log("==============================================");
  if (allOk) {
    log("PASS", "OBSIDIAN GUARD COMPLETO - Vault listo para operaciones git.");
    return 0;
  }
  log("FAIL", "OBSIDIAN GUARD FALLIDO - Resuelve los fallos antes de continuar.");
  return 1;
}

const exitCode = main();
process.exit(exitCode);

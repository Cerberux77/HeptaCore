#!/usr/bin/env node

import { runScheduled, runDateRange, runFullQueue } from "./scheduler.mjs";
import { validateQueue, validateAssets } from "./validate.mjs";
import { printReport } from "./report.mjs";
import { config } from "./config.mjs";

function usage() {
  console.log(`
HeptaCore RRSS Worker v0.1

Uso:
  npm run worker                         -> Simular drafts del dia actual
  npm run worker -- --date YYYY-MM-DD    -> Simular drafts de una fecha especifica
  npm run worker -- --range A B          -> Simular rango de fechas
  npm run worker -- --full               -> Simular toda la cola
  npm run worker -- --validate           -> Validar assets y drafts
  npm run worker -- --report             -> Generar reporte de la cola

Configuracion:
  HEPTACORE_TENANT_SLUG=turpial por defecto
  BOT_MODE=draft por defecto
  BOT_DRY_RUN=true por defecto

Regla:
  No publicar, gastar, responder temas sensibles ni usar credenciales reales sin aprobacion humana.
`);
}

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  usage();
  process.exit(0);
}

console.log("\nHeptaCore RRSS Worker v0.1");
console.log(`Tenant: ${config.tenantSlug} | Modo: ${config.mode} | Dry Run: ${config.dryRun}`);
console.log("========================================");

if (args.includes("--validate")) {
  validateAssets();
  console.log("");
  validateQueue();
  process.exit(0);
}

if (args.includes("--report")) {
  printReport();
  process.exit(0);
}

if (args.includes("--full")) {
  await runFullQueue();
  process.exit(0);
}

const dateIdx = args.indexOf("--date");
if (dateIdx !== -1 && args[dateIdx + 1]) {
  await runScheduled(args[dateIdx + 1]);
  process.exit(0);
}

const rangeIdx = args.indexOf("--range");
if (rangeIdx !== -1 && args[rangeIdx + 1] && args[rangeIdx + 2]) {
  await runDateRange(args[rangeIdx + 1], args[rangeIdx + 2]);
  process.exit(0);
}

await runScheduled();

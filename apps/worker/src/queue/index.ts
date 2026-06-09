#!/usr/bin/env node

import { startWorker } from "./worker.js";
import { publishQueue, validateQueue, testQueue, getQueueStats, closeQueues } from "./client.js";
import { prisma } from "./prisma.js";
import type { PublishDraftJob } from "./types.js";

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
HeptaCore Worker Queue v0.2 — BullMQ + Redis

Comandos:
  --worker                    Iniciar worker processor (consumir jobs)
  --enqueue-drafts [tenant]   Encolar todos los drafts DRAFT para publicar
  --enqueue-date YYYY-MM-DD   Encolar drafts programados para una fecha
  --enqueue-single DRAFT_ID   Encolar un draft especifico
  --validate [tenant]         Validar assets de todos los drafts
  --test [tenant]             Escaneo de test-mode
  --stats                     Mostrar estadisticas de queues
  --clean                     Limpiar queues (quitar jobs completados/fallidos)

Redis: REDIS_URL o REDISCLOUD_URL (default: redis://localhost:6379)
DB:    DATABASE_URL (Neon pool)
`);
    process.exit(0);
  }

  if (args.includes("--worker")) {
    startWorker();
    console.log("[cli] Worker running. Press Ctrl+C to stop.");
    process.on("SIGINT", async () => {
      console.log("\n[cli] Shutting down worker...");
      await closeQueues();
      await prisma.$disconnect();
      process.exit(0);
    });
    return;
  }

  if (args.includes("--enqueue-drafts")) {
    const slugIdx = args.indexOf("--enqueue-drafts");
    const slug = args[slugIdx + 1]?.startsWith("--") ? null : args[slugIdx + 1];
    console.log("[cli] Enqueueing drafts...");

    const where: Record<string, unknown> = { status: "DRAFT" };
    if (slug) {
      const tenant = await prisma.tenant.findFirst({ where: { slug } });
      if (!tenant) { console.error(`Tenant not found: ${slug}`); process.exit(1); }
      where.tenantId = tenant.id;
    }

    const drafts = await prisma.contentDraft.findMany({ where: where as any, select: { id: true, tenantId: true } });
    const tenantIds = new Set(drafts.map((d) => d.tenantId));

    const tenantMap = new Map<string, string>();
    for (const tid of tenantIds) {
      const t = await prisma.tenant.findUnique({ where: { id: tid }, select: { slug: true } });
      if (t) tenantMap.set(tid, t.slug);
    }

    for (const draft of drafts) {
      await publishQueue.add("publish-draft", {
        tenantId: draft.tenantId,
        draftId: draft.id,
        mode: "dry-run",
      } as PublishDraftJob);
    }

    console.log(`[cli] Enqueued ${drafts.length} drafts from ${tenantMap.size} tenant(s)`);
    await closeQueues();
    await prisma.$disconnect();
    return;
  }

  if (args.includes("--enqueue-date")) {
    const dateIdx = args.indexOf("--enqueue-date");
    const date = args[dateIdx + 1];
    if (!date) { console.error("Missing date. Use: --enqueue-date YYYY-MM-DD"); process.exit(1); }

    const dayStart = new Date(date);
    const dayEnd = new Date(date);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const drafts = await prisma.contentDraft.findMany({
      where: {
        status: "DRAFT",
        scheduledFor: { gte: dayStart, lt: dayEnd },
      },
      select: { id: true, tenantId: true },
    });

    for (const draft of drafts) {
      await publishQueue.add("publish-draft", {
        tenantId: draft.tenantId,
        draftId: draft.id,
        mode: "dry-run",
      } as PublishDraftJob);
    }

    console.log(`[cli] Enqueued ${drafts.length} drafts for ${date}`);
    await closeQueues();
    await prisma.$disconnect();
    return;
  }

  if (args.includes("--enqueue-single")) {
    const idIdx = args.indexOf("--enqueue-single");
    const draftId = args[idIdx + 1];
    if (!draftId) { console.error("Missing draft ID. Use: --enqueue-single DRAFT_ID"); process.exit(1); }

    const draft = await prisma.contentDraft.findUnique({ where: { id: draftId }, select: { id: true, tenantId: true } });
    if (!draft) { console.error(`Draft not found: ${draftId}`); process.exit(1); }

    await publishQueue.add("publish-draft", {
      tenantId: draft.tenantId,
      draftId: draft.id,
      mode: "dry-run",
    } as PublishDraftJob);

    console.log(`[cli] Enqueued draft ${draftId}`);
    await closeQueues();
    await prisma.$disconnect();
    return;
  }

  if (args.includes("--test")) {
    const tIdx = args.indexOf("--test");
    const slug = args[tIdx + 1]?.startsWith("--") ? null : args[tIdx + 1];

    let tenantId: string | undefined;
    if (slug) {
      const t = await prisma.tenant.findFirst({ where: { slug } });
      if (!t) { console.error(`Tenant not found: ${slug}`); process.exit(1); }
      tenantId = t.id;
    } else {
      const first = await prisma.tenant.findFirst();
      if (first) tenantId = first.id;
    }

    if (!tenantId) { console.error("No tenants in DB"); process.exit(1); }

    await testQueue.add("test-mode", { tenantId, mode: "dry-run" });
    console.log(`[cli] Test-mode job enqueued for tenant ${tenantId}`);
    await closeQueues();
    await prisma.$disconnect();
    return;
  }

  if (args.includes("--stats")) {
    const stats = await getQueueStats();
    console.log("\n=== Queue Stats ===");
    console.log(`  heptacore-publish:    waiting=${stats.publish.waiting} active=${stats.publish.active} completed=${stats.publish.completed} failed=${stats.publish.failed} delayed=${stats.publish.delayed}`);
    console.log(`  heptacore-validate:   waiting=${stats.validate.waiting} active=${stats.validate.active} completed=${stats.validate.completed} failed=${stats.validate.failed} delayed=${stats.validate.delayed}`);
    console.log(`  heptacore-test:       waiting=${stats.test.waiting} active=${stats.test.active} completed=${stats.test.completed} failed=${stats.test.failed} delayed=${stats.test.delayed}`);
    await closeQueues();
    await prisma.$disconnect();
    return;
  }

  if (args.includes("--clean")) {
    await publishQueue.clean(0, 1000, "completed");
    await publishQueue.clean(0, 1000, "failed");
    await validateQueue.clean(0, 1000, "completed");
    await validateQueue.clean(0, 1000, "failed");
    await testQueue.clean(0, 1000, "completed");
    await testQueue.clean(0, 1000, "failed");
    console.log("[cli] Queues cleaned.");
    await closeQueues();
    await prisma.$disconnect();
    return;
  }

  console.log("[cli] No command provided. Use --help for options.");
  await closeQueues();
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("[cli] Fatal:", err);
  await closeQueues();
  await prisma.$disconnect();
  process.exit(1);
});

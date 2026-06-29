import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const tenantSlug = url.searchParams.get("tenantSlug");
  const period = url.searchParams.get("period") ?? "current";
  if (!tenantSlug) {
    return NextResponse.json({ error: "tenantSlug is required" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findFirst({
    where: { slug: tenantSlug },
    select: { id: true, costConfig: true },
  });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const isAdmin = session.user.memberships?.some(
    (m) => m.role === "SUPER_ADMIN" || m.role === "TENANT_ADMIN" || m.role === "OWNER" || m.role === "ADMIN",
  );
  if (!isAdmin && !session.user.memberships?.some((m) => m.tenantId === tenant.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const costConfig = (tenant.costConfig as Record<string, unknown>) ?? {};
  const billingPeriodDays = typeof costConfig.billingPeriodDays === "number" ? costConfig.billingPeriodDays : 30;

  const now = new Date();
  let periodStart: Date;
  if (period === "all") {
    periodStart = new Date(0);
  } else {
    periodStart = new Date(now.getTime() - billingPeriodDays * 24 * 60 * 60 * 1000);
  }

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      tenantId: tenant.id,
      action: { in: ["strategy_generated", "llm_usage"] },
      createdAt: { gte: periodStart },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      action: true,
      metadata: true,
      createdAt: true,
    },
  });

  const entries = auditLogs
    .map((log) => {
      const meta = (log.metadata as Record<string, unknown>) ?? {};
      const cost = (meta.cost as Record<string, unknown>) ?? {};
      return {
        action: log.action,
        provider: (cost.provider ?? meta.provider ?? "unknown") as string,
        model: (cost.model ?? meta.model ?? "unknown") as string,
        promptTokens: (cost.promptTokens as number) ?? 0,
        completionTokens: (cost.completionTokens as number) ?? 0,
        apiCost: (cost.apiCost as number) ?? 0,
        tenantCost: (cost.tenantCost as number) ?? 0,
        heptaCoreProfit: (cost.heptaCoreProfit as number) ?? 0,
        at: log.createdAt.toISOString(),
      };
    });

  let totalApiCost = 0;
  let totalTenantCost = 0;
  let totalHeptaCoreProfit = 0;
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  for (const e of entries) {
    totalApiCost += e.apiCost;
    totalTenantCost += e.tenantCost;
    totalHeptaCoreProfit += e.heptaCoreProfit;
    totalPromptTokens += e.promptTokens;
    totalCompletionTokens += e.completionTokens;
  }

  const maxSpendPerPeriodUsd = typeof costConfig.maxSpendPerPeriodUsd === "number"
    ? costConfig.maxSpendPerPeriodUsd
    : 10.00;

  return NextResponse.json({
    ok: true,
    tenantSlug,
    period: period === "all" ? "all" : `${billingPeriodDays}d`,
    billingPeriodDays,
    maxSpendPerPeriodUsd,
    summary: {
      totalApiCost: parseFloat(totalApiCost.toFixed(6)),
      totalTenantCost: parseFloat(totalTenantCost.toFixed(4)),
      totalHeptaCoreProfit: parseFloat(totalHeptaCoreProfit.toFixed(4)),
      totalPromptTokens,
      totalCompletionTokens,
      callCount: entries.length,
      periodStart: periodStart.toISOString(),
      periodEnd: now.toISOString(),
    },
    entries,
  });
}

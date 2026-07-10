import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { isPlatformSuperAdmin } from "../../../../lib/role-model";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const tenantSlug = url.searchParams.get("tenantSlug");
  if (!tenantSlug) {
    return NextResponse.json({ error: "tenantSlug is required" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findFirst({
    where: { slug: tenantSlug },
    select: { id: true, llmConfig: true, costConfig: true },
  });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const isAdmin = isPlatformSuperAdmin(session.user.platformRole)
    || session.user.memberships?.some((m) => m.tenantId === tenant.id && m.role === "TENANT_ADMIN");
  if (!isAdmin && !session.user.memberships?.some((m) => m.tenantId === tenant.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const llmConfig = (tenant.llmConfig as Record<string, unknown>) ?? {};
  const costConfig = (tenant.costConfig as Record<string, unknown>) ?? {};

  return NextResponse.json({
    ok: true,
    governance: {
      enabledProviders: Array.isArray(llmConfig.enabledProviders)
        ? llmConfig.enabledProviders
        : ["openai", "anthropic", "gemini", "deepseek"],
      taskModels: (llmConfig.taskModels as Record<string, string>) ?? {
        strategy: "gpt-4o-mini",
        generation: "gpt-4o-mini",
        analysis: "gpt-4o-mini",
      },
      maxSpendPerPeriodUsd: typeof costConfig.maxSpendPerPeriodUsd === "number"
        ? costConfig.maxSpendPerPeriodUsd
        : 10.00,
      billingPeriodDays: typeof costConfig.billingPeriodDays === "number"
        ? costConfig.billingPeriodDays
        : 30,
      overheadFactor: typeof costConfig.overheadFactor === "number"
        ? costConfig.overheadFactor
        : 2.0,
      requirePreflightEstimate: typeof costConfig.requirePreflightEstimate === "boolean"
        ? costConfig.requirePreflightEstimate
        : true,
      blockOnSpendExceeded: typeof costConfig.blockOnSpendExceeded === "boolean"
        ? costConfig.blockOnSpendExceeded
        : true,
    },
  });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.tenantSlug !== "string") {
    return NextResponse.json({ error: "tenantSlug is required" }, { status: 400 });
  }

  const { tenantSlug, enabledProviders, taskModels, maxSpendPerPeriodUsd, billingPeriodDays, overheadFactor, requirePreflightEstimate, blockOnSpendExceeded } = body as {
    tenantSlug: string;
    enabledProviders?: string[];
    taskModels?: Record<string, string>;
    maxSpendPerPeriodUsd?: number;
    billingPeriodDays?: number;
    overheadFactor?: number;
    requirePreflightEstimate?: boolean;
    blockOnSpendExceeded?: boolean;
  };

  const tenant = await prisma.tenant.findFirst({
    where: { slug: tenantSlug },
    select: { id: true, llmConfig: true, costConfig: true },
  });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const isAdmin = isPlatformSuperAdmin(session.user.platformRole)
    || session.user.memberships?.some((m) => m.tenantId === tenant.id && m.role === "TENANT_ADMIN");
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden: admin role required" }, { status: 403 });
  }

  const existingLlm = (tenant.llmConfig as Record<string, unknown>) ?? {};
  const existingCost = (tenant.costConfig as Record<string, unknown>) ?? {};

  const newLlmConfig: Record<string, unknown> = { ...existingLlm };
  if (enabledProviders !== undefined) newLlmConfig.enabledProviders = enabledProviders;
  if (taskModels !== undefined) newLlmConfig.taskModels = taskModels;

  const newCostConfig: Record<string, unknown> = { ...existingCost };
  if (typeof maxSpendPerPeriodUsd === "number") newCostConfig.maxSpendPerPeriodUsd = maxSpendPerPeriodUsd;
  if (typeof billingPeriodDays === "number") newCostConfig.billingPeriodDays = billingPeriodDays;
  if (typeof overheadFactor === "number") newCostConfig.overheadFactor = overheadFactor;
  if (typeof requirePreflightEstimate === "boolean") newCostConfig.requirePreflightEstimate = requirePreflightEstimate;
  if (typeof blockOnSpendExceeded === "boolean") newCostConfig.blockOnSpendExceeded = blockOnSpendExceeded;

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      llmConfig: JSON.parse(JSON.stringify(newLlmConfig)),
      costConfig: JSON.parse(JSON.stringify(newCostConfig)),
    } as any,
  });

  return NextResponse.json({
    ok: true,
    governance: {
      enabledProviders: newLlmConfig.enabledProviders ?? ["openai", "anthropic", "gemini", "deepseek"],
      taskModels: newLlmConfig.taskModels ?? { strategy: "gpt-4o-mini", generation: "gpt-4o-mini", analysis: "gpt-4o-mini" },
      maxSpendPerPeriodUsd: newCostConfig.maxSpendPerPeriodUsd ?? 10.00,
      billingPeriodDays: newCostConfig.billingPeriodDays ?? 30,
      overheadFactor: newCostConfig.overheadFactor ?? 2.0,
      requirePreflightEstimate: newCostConfig.requirePreflightEstimate ?? true,
      blockOnSpendExceeded: newCostConfig.blockOnSpendExceeded ?? true,
    },
  });
}

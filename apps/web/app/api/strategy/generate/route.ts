import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { auditLog } from "../../../../lib/audit";
import {
  clientIntakeSchema,
  generateStrategyWithLLM,
} from "@heptacore/agents";
import type { TurpialContext } from "@heptacore/agents";
import {
  calculateApiCost,
  calculateTenantCost,
  DEFAULT_OVERHEAD_FACTOR,
} from "@heptacore/core";

export const dynamic = "force-dynamic";

function normalizeNetworks(value: unknown, fallback: string[]) {
  const allowed = new Set(["instagram", "facebook", "tiktok", "youtube", "linkedin", "x"]);
  if (!Array.isArray(value)) return fallback;
  const networks = value
    .map((network) => String(network).toLowerCase())
    .filter((network, index, arr) => allowed.has(network) && arr.indexOf(network) === index);
  return networks.length > 0 ? networks : fallback;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.tenantSlug !== "string") {
    return NextResponse.json({ error: "tenantSlug is required" }, { status: 400 });
  }

  const tenantSlug = body.tenantSlug as string;

  const tenant = await prisma.tenant.findFirst({
    where: { slug: tenantSlug },
    select: { id: true, name: true, llmConfig: true, costConfig: true },
  });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const membership = await prisma.membership.findFirst({
    where: { tenantId: tenant.id, userId: session.user.id },
    select: { role: true },
  });
  if (!membership || !["OWNER", "ADMIN", "STRATEGIST", "EDITOR", "SUPER_ADMIN", "TENANT_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden: strategist role required" }, { status: 403 });
  }

  let intake = body.intake;
  if (!intake) {
    const existing = await prisma.project.findFirst({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      select: { name: true, description: true },
    });
    const [brandProfile, socialAccounts] = await Promise.all([
      prisma.brandProfile.findFirst({
        where: { tenantId: tenant.id },
        select: { targetAudience: true, socialChannels: true },
      }),
      prisma.socialAccount.findMany({
        where: { tenantId: tenant.id },
        select: { network: true },
      }),
    ]);
    const selectedNetworks = normalizeNetworks(
      body.preferredNetworks ?? brandProfile?.socialChannels,
      socialAccounts.length > 0
        ? socialAccounts.map((account) => account.network.toLowerCase())
        : ["instagram", "facebook"],
    );

    const audience = Array.isArray(brandProfile?.targetAudience)
      ? (brandProfile.targetAudience as unknown[]).map(String).join(", ")
      : typeof brandProfile?.targetAudience === "string"
        ? brandProfile.targetAudience
        : "general audience";

    intake = {
      tenantId: tenant.id,
      businessName: existing?.name ?? tenant.name,
      offer: existing?.description ?? `${tenant.name} services`,
      market: "social media marketing",
      audience,
      constraints: body.constraints ?? [],
      preferredNetworks: selectedNetworks,
    };
  }

  if (body.preferredNetworks && intake) {
    intake = {
      ...intake,
      preferredNetworks: normalizeNetworks(body.preferredNetworks, intake.preferredNetworks ?? ["instagram", "facebook"]),
    };
  }

  if (!intake) {
    const brandProfile = await prisma.brandProfile.findFirst({
      where: { tenantId: tenant.id },
      select: { targetAudience: true },
    });
    intake = {
      tenantId: tenant.id,
      businessName: tenant.name,
      offer: `${tenant.name} services`,
      market: "social media marketing",
      audience: String(brandProfile?.targetAudience ?? "general audience"),
      constraints: body.constraints ?? [],
      preferredNetworks: normalizeNetworks(body.preferredNetworks, ["instagram", "facebook"]),
    };
  }

  const parsed = clientIntakeSchema.safeParse(intake);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid intake", details: parsed.error.flatten() }, { status: 400 });
  }

  const context: Partial<TurpialContext> = {};
  try {
    const [brandProfile, pillars, assets] = await Promise.all([
      prisma.brandProfile.findFirst({
        where: { tenantId: tenant.id },
        select: { toneOfVoice: true },
      }),
      prisma.contentPillar.findMany({
        where: { tenantId: tenant.id },
        orderBy: { priority: "desc" },
        select: { name: true, description: true },
      }),
      prisma.asset.findMany({
        where: { tenantId: tenant.id },
        take: 50,
        orderBy: { createdAt: "desc" },
        select: { filename: true, kind: true },
      }),
    ]);

    const voice = Array.isArray(brandProfile?.toneOfVoice)
      ? (brandProfile.toneOfVoice as unknown[]).map(String)
      : brandProfile?.toneOfVoice && typeof brandProfile.toneOfVoice === "object"
        ? Object.values(brandProfile.toneOfVoice as Record<string, unknown>).map(String)
        : [];

    context.brandVoice = voice;
    context.contentPillars = pillars.map((p) => ({ name: p.name, description: p.description ?? "" }));
    context.existingAssets = assets;
    context.constraints = parsed.data.constraints;
    context.businessName = parsed.data.businessName;
    context.offer = parsed.data.offer;
    context.market = parsed.data.market;
    context.audience = parsed.data.audience;
  } catch (err) {
    console.warn("Could not load tenant context for strategy generation:", err instanceof Error ? err.message : err);
  }

  const tenantLlmConfig = (tenant.llmConfig as Record<string, unknown>) ?? {};

  const providerConfig = {
    provider: String(body.providerConfig?.provider || tenantLlmConfig.provider || process.env.LLM_PROVIDER || "deterministic"),
    apiKey: String(body.providerConfig?.apiKey || tenantLlmConfig.apiKey || process.env.LLM_PROVIDER_API_KEY || ""),
    model: String(body.providerConfig?.model || tenantLlmConfig.model || process.env.LLM_MODEL || ""),
  };

  const result = await generateStrategyWithLLM(parsed.data, context, providerConfig);

  const tenantCostConfig = (tenant.costConfig as Record<string, unknown>) ?? {};
  const overheadFactor = typeof tenantCostConfig.overheadFactor === "number"
    ? tenantCostConfig.overheadFactor
    : DEFAULT_OVERHEAD_FACTOR;

  let costInfo: Record<string, unknown> | null = null;
  if (result.usage && providerConfig.provider !== "deterministic") {
    const { totalApiCost, modelPricing } = calculateApiCost(
      providerConfig.model || "unknown",
      result.usage.promptTokens,
      result.usage.completionTokens,
    );
    const { tenantCost, heptaCoreProfit } = calculateTenantCost(totalApiCost, overheadFactor);
    costInfo = {
      model: providerConfig.model,
      modelLabel: modelPricing.label,
      reasoning: modelPricing.reasoning,
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
      apiCost: parseFloat(totalApiCost.toFixed(6)),
      overheadFactor,
      tenantCost: parseFloat(tenantCost.toFixed(4)),
      heptaCoreProfit: parseFloat(heptaCoreProfit.toFixed(4)),
      currency: "USD",
    };
  }

  await auditLog({
    tenantId: tenant.id,
    actorId: session.user.id,
    action: "strategy_generated",
    target: `tenant:${tenant.id}`,
    metadata: {
      provider: result.provider,
      title: result.strategy.title,
      channels: result.strategy.channels.length,
      draftPlanItems: result.strategy.draftPlan.length,
      cost: costInfo,
    },
  });

  return NextResponse.json({
    ok: true,
    tenantSlug,
    strategy: result.strategy,
    provider: result.provider,
    cost: costInfo,
  });
}

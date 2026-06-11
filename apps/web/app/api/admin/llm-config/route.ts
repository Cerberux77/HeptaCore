import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

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

  const isAdmin = session.user.memberships?.some(
    (m) => m.role === "SUPER_ADMIN" || m.role === "TENANT_ADMIN" || m.role === "OWNER" || m.role === "ADMIN",
  );
  if (!isAdmin && !session.user.memberships?.some((m) => m.tenantId === tenant.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const config = (tenant.llmConfig as Record<string, unknown>) ?? {};
  const costConfig = (tenant.costConfig as Record<string, unknown>) ?? {};

  return NextResponse.json({
    ok: true,
    llmConfig: {
      provider: config.provider ?? "deterministic",
      model: config.model ?? "",
      apiKey: config.apiKey ? "••••••••" : "",
    },
    costConfig: {
      overheadFactor: typeof costConfig.overheadFactor === "number" ? costConfig.overheadFactor : 2.0,
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

  const { tenantSlug, provider, model, apiKey, overheadFactor } = body as {
    tenantSlug: string;
    provider?: string;
    model?: string;
    apiKey?: string;
    overheadFactor?: number;
  };

  const tenant = await prisma.tenant.findFirst({
    where: { slug: tenantSlug },
    select: { id: true, llmConfig: true, costConfig: true },
  });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const isAdmin = session.user.memberships?.some(
    (m) => m.role === "SUPER_ADMIN" || m.role === "TENANT_ADMIN" || m.role === "OWNER" || m.role === "ADMIN",
  );
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden: admin role required" }, { status: 403 });
  }

  const existing = (tenant.llmConfig as Record<string, unknown>) ?? {};
  const newConfig: Record<string, unknown> = { ...existing };

  if (provider !== undefined) newConfig.provider = provider;
  if (model !== undefined) newConfig.model = model;
  if (apiKey !== undefined && apiKey !== "••••••••") newConfig.apiKey = apiKey;

  const existingCost = (tenant.costConfig as Record<string, unknown>) ?? {};
  const newCostConfig: Record<string, unknown> = { ...existingCost };

  if (typeof overheadFactor === "number") newCostConfig.overheadFactor = overheadFactor;

  const updateData: Record<string, unknown> = { llmConfig: JSON.parse(JSON.stringify(newConfig)) };
  if (overheadFactor !== undefined) {
    updateData.costConfig = JSON.parse(JSON.stringify(newCostConfig));
  }

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: updateData as any,
  });

  return NextResponse.json({
    ok: true,
    llmConfig: {
      provider: newConfig.provider ?? "deterministic",
      model: newConfig.model ?? "",
      apiKey: newConfig.apiKey ? "••••••••" : "",
    },
    costConfig: {
      overheadFactor: newCostConfig.overheadFactor ?? 2.0,
    },
  });
}

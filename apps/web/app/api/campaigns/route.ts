import { NextResponse } from "next/server";
import { auth } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { auditLog } from "../../../lib/audit";

export const dynamic = "force-dynamic";

const CAMPAIGN_ROLES = ["OWNER", "ADMIN", "SUPER_ADMIN", "TENANT_ADMIN"];

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

  const tenant = await prisma.tenant.findFirst({ where: { slug: tenantSlug }, select: { id: true } });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const membership = await prisma.membership.findFirst({
    where: { tenantId: tenant.id, userId: session.user.id },
    select: { role: true },
  });
  if (!membership || !CAMPAIGN_ROLES.includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const campaigns = await prisma.campaign.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      network: true,
      objective: true,
      platformBudget: true,
      overheadRate: true,
      totalCharge: true,
      status: true,
      createdAt: true,
      socialAccountId: true,
    },
  });

  return NextResponse.json({
    ok: true,
    campaigns: campaigns.map((c) => ({
      ...c,
      platformBudget: Number(c.platformBudget),
      overheadRate: Number(c.overheadRate),
      totalCharge: Number(c.totalCharge),
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.tenantSlug) {
    return NextResponse.json({ error: "tenantSlug is required" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findFirst({ where: { slug: body.tenantSlug }, select: { id: true, name: true } });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const membership = await prisma.membership.findFirst({
    where: { tenantId: tenant.id, userId: session.user.id },
    select: { role: true },
  });
  if (!membership || ![...CAMPAIGN_ROLES, "STRATEGIST"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const name = String(body.name ?? "").trim();
  const network = String(body.network ?? "INSTAGRAM");
  const objective = String(body.objective ?? "").trim();
  const platformBudget = Number(body.platformBudget ?? 0);
  const overheadRate = 0.35;
  const totalCharge = platformBudget * (1 + overheadRate);

  if (!name || !objective || platformBudget <= 0) {
    return NextResponse.json({ error: "name, objective, and platformBudget are required" }, { status: 400 });
  }

  const campaign = await prisma.campaign.create({
    data: {
      tenantId: tenant.id,
      name,
      network: network as any,
      objective,
      platformBudget,
      overheadRate,
      totalCharge,
      status: "PROPOSED",
    },
  });

  await auditLog({
    tenantId: tenant.id,
    actorId: session.user.id,
    action: "campaign_proposed",
    target: `campaign:${campaign.id}`,
    metadata: { name, network, platformBudget, overheadRate, totalCharge },
  });

  return NextResponse.json({
    ok: true,
    campaign: {
      ...campaign,
      platformBudget: Number(campaign.platformBudget),
      overheadRate: Number(campaign.overheadRate),
      totalCharge: Number(campaign.totalCharge),
    },
  });
}

import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { auditLog } from "../../../../lib/audit";
import { hasCanonicalTenantAccess } from "../../../../lib/role-model";

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.tenantSlug !== "string") {
    return NextResponse.json({ error: "tenantSlug is required" }, { status: 400 });
  }

  const { tenantSlug, projectName, projectDescription, brandVoice, pillars, channels } = body as {
    tenantSlug: string;
    projectName?: string;
    projectDescription?: string;
    brandVoice?: string[];
    pillars?: Array<{ name: string; description?: string; priority?: number }>;
    channels?: Array<{ network: string; priority: number; cadence: string; formats: string[] }>;
  };

  const tenant = await prisma.tenant.findFirst({
    where: { slug: tenantSlug },
    select: { id: true, name: true },
  });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const membership = await prisma.membership.findFirst({
    where: { tenantId: tenant.id, userId: session.user.id },
  });
  if (!hasCanonicalTenantAccess(session.user.platformRole, membership?.role, ["TENANT_ADMIN", "PUBLISHER"])) {
    return NextResponse.json({ error: "Forbidden: strategist role required" }, { status: 403 });
  }

  const changes: string[] = [];

  if (projectName || projectDescription) {
    const existing = await prisma.project.findFirst({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
    });
    if (existing) {
      await prisma.project.update({
        where: { id: existing.id },
        data: {
          ...(projectName ? { name: projectName } : {}),
          ...(projectDescription ? { description: projectDescription } : {}),
        },
      });
    } else {
      await prisma.project.create({
        data: {
          tenantId: tenant.id,
          name: projectName || tenant.name,
          description: projectDescription || "",
        },
      });
    }
    changes.push("project");
  }

  if (brandVoice && brandVoice.length > 0) {
    const existing = await prisma.brandProfile.findFirst({ where: { tenantId: tenant.id } });
    if (existing) {
      await prisma.brandProfile.update({
        where: { id: existing.id },
        data: { toneOfVoice: brandVoice },
      });
    } else {
      await prisma.brandProfile.create({
        data: {
          id: crypto.randomUUID(),
          tenantId: tenant.id,
          brandName: tenant.name,
          toneOfVoice: brandVoice,
          updatedAt: new Date(),
        },
      });
    }
    changes.push("brandVoice");
  }

  if (pillars && pillars.length > 0) {
    for (const p of pillars) {
      await prisma.contentPillar.upsert({
        where: { tenantId_name: { tenantId: tenant.id, name: p.name } },
        create: {
          id: crypto.randomUUID(),
          tenantId: tenant.id,
          name: p.name,
          description: p.description ?? "",
          priority: p.priority ?? 0,
          updatedAt: new Date(),
        },
        update: {
          description: p.description ?? "",
          priority: p.priority ?? 0,
        },
      });
    }
    changes.push("pillars");
  }

  if (channels && channels.length > 0) {
    await prisma.strategyBrief.upsert({
      where: {
        id: `${tenant.id}_strategy`,
      },
      create: {
        id: `${tenant.id}_strategy`,
        tenantId: tenant.id,
        title: `Estrategia ${tenant.name}`,
        channels,
        updatedAt: new Date(),
      },
      update: {
        channels,
      },
    });
    changes.push("channels");
  }

  await auditLog({
    tenantId: tenant.id,
    actorId: session.user.id,
    action: "strategy_updated",
    target: `tenant:${tenant.id}`,
    metadata: { changes },
  });

  return NextResponse.json({ ok: true, changes });
}

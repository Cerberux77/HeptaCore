import { NextResponse } from "next/server";
import { auditLog } from "../../../lib/audit";
import { auth } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

const NETWORKS = ["INSTAGRAM", "FACEBOOK", "YOUTUBE", "TIKTOK", "LINKEDIN", "X"] as const;
const NETWORK_SET = new Set<string>(NETWORKS);
const ADMIN_ROLES = ["OWNER", "ADMIN", "STRATEGIST", "SUPER_ADMIN", "TENANT_ADMIN"];

function normalizeNetworks(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((network) => String(network).toUpperCase())
    .filter((network, index, arr) => NETWORK_SET.has(network) && arr.indexOf(network) === index);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const tenantSlug = String(body?.tenantSlug ?? "");
  const networks = normalizeNetworks(body?.networks);

  if (!tenantSlug || networks.length === 0) {
    return NextResponse.json({ error: "tenantSlug and networks are required" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findFirst({
    where: { slug: tenantSlug },
    select: { id: true, name: true },
  });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const membership = await prisma.membership.findFirst({
    where: { tenantId: tenant.id, userId: session.user.id },
    select: { role: true },
  });
  if (!membership || !ADMIN_ROLES.includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden: admin or strategist role required" }, { status: 403 });
  }

  const existingProfile = await prisma.brandProfile.findFirst({
    where: { tenantId: tenant.id },
    select: { id: true, socialChannels: true },
  });
  const currentNetworks = normalizeNetworks(existingProfile?.socialChannels);
  const selectedNetworks = [...currentNetworks, ...networks].filter(
    (network, index, arr) => arr.indexOf(network) === index,
  );

  if (existingProfile) {
    await prisma.brandProfile.update({
      where: { id: existingProfile.id },
      data: { socialChannels: selectedNetworks, updatedAt: new Date() },
    });
  } else {
    await prisma.brandProfile.create({
      data: {
        id: `${tenant.id}_brand_profile`,
        tenantId: tenant.id,
        brandName: tenant.name,
        socialChannels: selectedNetworks,
        toneOfVoice: ["criterio tecnico", "confianza", "comunidad"],
        updatedAt: new Date(),
      },
    });
  }

  for (const network of selectedNetworks) {
    const existing = await prisma.socialAccount.findFirst({
      where: { tenantId: tenant.id, network: network as (typeof NETWORKS)[number] },
    });
    if (!existing) {
      await prisma.socialAccount.create({
        data: {
          tenantId: tenant.id,
          network: network as (typeof NETWORKS)[number],
          handle: network === "INSTAGRAM" ? "@turpialsound" : tenant.name,
          externalAccountId: `sandbox-${network.toLowerCase()}-${tenantSlug}`,
          status: "sandbox_connected",
          scopes: ["dry_run", "content_planning"],
        },
      });
    }
  }

  await auditLog({
    tenantId: tenant.id,
    actorId: session.user.id,
    action: "tenant_networks_updated",
    target: `tenant:${tenant.id}`,
    metadata: { selectedNetworks },
  });

  return NextResponse.json({ ok: true, tenantSlug, networks: selectedNetworks });
}

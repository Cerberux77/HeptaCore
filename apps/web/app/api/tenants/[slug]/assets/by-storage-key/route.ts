import { NextResponse } from "next/server";
import { auth } from "../../../../../../lib/auth";
import { serializeTenantAsset } from "../../../../../../lib/asset-presentation";
import { prisma } from "../../../../../../lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request, context: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { slug } = await context.params;

  const tenant = await prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
  if (!tenant) return NextResponse.json({ ok: false, error: "Tenant not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { tenantId_userId: { tenantId: tenant.id, userId: session.user.id } },
    select: { role: true },
  });
  if (!membership) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null) as { storageKey?: string } | null;
  if (!body?.storageKey) return NextResponse.json({ ok: false, error: "storageKey is required" }, { status: 400 });

  const asset = await prisma.asset.findFirst({
    where: { tenantId: tenant.id, storageKey: body.storageKey },
    include: { _count: { select: { drafts: true } } },
  });

  if (!asset) return NextResponse.json({ ok: true, found: false });

  return NextResponse.json({ ok: true, found: true, asset: serializeTenantAsset(asset, slug) });
}

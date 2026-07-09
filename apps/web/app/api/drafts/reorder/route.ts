import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { hasCanonicalTenantAccess } from "../../../../lib/role-model";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.id !== "string" || !["up", "down"].includes(body.direction)) {
    return NextResponse.json({ error: "id and direction (up|down) are required" }, { status: 400 });
  }

  const { id, direction } = body as { id: string; direction: "up" | "down" };

  const draft = await prisma.contentDraft.findUnique({
    where: { id },
    select: { id: true, tenantId: true, sortOrder: true },
  });
  if (!draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  const membership = await prisma.membership.findFirst({
    where: { tenantId: draft.tenantId, userId: session.user.id },
  });
  if (!hasCanonicalTenantAccess(session.user.platformRole, membership?.role, ["TENANT_ADMIN", "PUBLISHER"])) {
    return NextResponse.json({ error: "Forbidden: editor role required" }, { status: 403 });
  }

  const currentOrder = draft.sortOrder ?? 0;

  const neighbor = await prisma.contentDraft.findFirst({
    where: {
      tenantId: draft.tenantId,
      id: { not: id },
      sortOrder: direction === "up" ? { lt: currentOrder } : { gt: currentOrder },
    },
    orderBy: { sortOrder: direction === "up" ? "desc" : "asc" },
    select: { id: true, sortOrder: true },
  });

  if (!neighbor || neighbor.sortOrder == null) {
    return NextResponse.json({ ok: true, moved: false });
  }

  await Promise.all([
    prisma.contentDraft.update({ where: { id: draft.id }, data: { sortOrder: neighbor.sortOrder } }),
    prisma.contentDraft.update({ where: { id: neighbor.id }, data: { sortOrder: currentOrder } }),
  ]);

  return NextResponse.json({ ok: true, moved: true });
}

import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body.filename !== "string" || !body.filename.trim()) {
    return NextResponse.json({ error: "filename is required" }, { status: 400 });
  }

  const { filename } = body as { filename: string };

  const asset = await prisma.asset.findUnique({
    where: { id },
    select: { id: true, tenantId: true },
  });
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const membership = await prisma.membership.findFirst({
    where: { tenantId: asset.tenantId, userId: session.user.id },
  });
  if (!membership || !["OWNER", "ADMIN", "EDITOR", "STRATEGIST", "SUPER_ADMIN", "TENANT_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.asset.update({
    where: { id },
    data: { filename: filename.trim() },
  });

  return NextResponse.json({ ok: true, asset: updated });
}

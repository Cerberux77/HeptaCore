import { NextResponse } from "next/server";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const tenantSlug = formData.get("tenantSlug") as string | null;
  const kind = (formData.get("kind") as string) ?? "IMAGE";

  if (!file || !tenantSlug) {
    return NextResponse.json({ error: "file and tenantSlug are required" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findFirst({
    where: { slug: tenantSlug },
    select: { id: true },
  });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const membership = await prisma.membership.findFirst({
    where: { tenantId: tenant.id, userId: session.user.id },
  });
  if (!membership || !["OWNER", "ADMIN", "EDITOR", "STRATEGIST", "SUPER_ADMIN", "TENANT_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "video/mp4", "audio/mpeg", "application/pdf"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: `Tipo de archivo no soportado: ${file.type}` }, { status: 400 });
  }

  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    return NextResponse.json({ error: "Archivo demasiado grande (max 50MB)" }, { status: 400 });
  }

  const root = process.cwd().replace(/\\apps\\web$/, "");
  const tenantDir = join(root, "examples", "tenants", tenantSlug, "content", "inbox");
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const destPath = join(tenantDir, `${timestamp}_${safeName}`);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(destPath, buffer);

  const relativePath = join("examples", "tenants", tenantSlug, "content", "inbox", `${timestamp}_${safeName}`);

  const asset = await prisma.asset.create({
    data: {
      tenantId: tenant.id,
      kind: kind as any,
      filename: file.name,
      sourcePath: relativePath,
      storageKey: relativePath,
      mimeType: file.type,
      metadata: { sizeBytes: file.size },
      rightsStatus: "needs_review",
    },
  });

  return NextResponse.json({ ok: true, asset });
}

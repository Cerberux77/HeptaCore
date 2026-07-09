import { NextResponse, NextRequest } from "next/server";
import { auth } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { randomUUID } from "node:crypto";
import { hashInvitationToken, generateInvitationToken, getInvitationExpiration } from "../../../lib/invitation-token";
import { resolvePublicOrigin } from "../../../lib/url-origin";
import { isAssignableTenantRole } from "../../../lib/canonical-tenant-role";
import { hasCanonicalTenantAccess } from "../../../lib/role-model";

export async function GET(req: NextRequest) {
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
  if (!hasCanonicalTenantAccess(session.user.platformRole, membership?.role, ["TENANT_ADMIN"])) {
    return NextResponse.json({ error: "Forbidden: admin role required" }, { status: 403 });
  }

  const invitations = await prisma.invitation.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      role: true,
      acceptedById: true,
      acceptedAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, invitations });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.tenantSlug !== "string" || typeof body.email !== "string" || typeof body.role !== "string") {
    return NextResponse.json({ error: "tenantSlug, email, and role are required" }, { status: 400 });
  }

  const { tenantSlug, email, role } = body as { tenantSlug: string; email: string; role: string };
  if (!isAssignableTenantRole(role)) {
    return NextResponse.json({ error: "Invalid canonical tenant role" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findFirst({ where: { slug: tenantSlug }, select: { id: true, name: true } });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const membership = await prisma.membership.findFirst({
    where: { tenantId: tenant.id, userId: session.user.id },
    select: { role: true },
  });
  if (!hasCanonicalTenantAccess(session.user.platformRole, membership?.role, ["TENANT_ADMIN"])) {
    return NextResponse.json({ error: "Forbidden: admin role required" }, { status: 403 });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const rawToken = generateInvitationToken();
  const tokenHash = hashInvitationToken(rawToken);

  const invitation = await prisma.invitation.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: normalizedEmail } },
    create: {
      id: randomUUID(),
      tenantId: tenant.id,
      email: normalizedEmail,
      role,
      tokenHash,
      expiresAt: getInvitationExpiration(),
    },
    update: {
      role,
      tokenHash,
      expiresAt: getInvitationExpiration(),
      acceptedById: null,
      acceptedAt: null,
    },
  });

  const origin = resolvePublicOrigin(req.nextUrl.origin);
  const inviteLink = `${origin}/register?token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(normalizedEmail)}`;

  return NextResponse.json({ ok: true, invitation: { id: invitation.id, email: normalizedEmail, role, inviteLink } });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const invitation = await prisma.invitation.findUnique({ where: { id } });
  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  const membership = await prisma.membership.findFirst({
    where: { tenantId: invitation.tenantId, userId: session.user.id },
    select: { role: true },
  });
  if (!hasCanonicalTenantAccess(session.user.platformRole, membership?.role, ["TENANT_ADMIN"])) {
    return NextResponse.json({ error: "Forbidden: admin role required" }, { status: 403 });
  }

  await prisma.invitation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

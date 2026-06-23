import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { hashInvitationToken } from "../../../../lib/invitation-token";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.email) {
    return NextResponse.json({ ok: false, code: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const token = body?.token as string;
  if (!token) return NextResponse.json({ ok: false, code: "INVALID_REQUEST" }, { status: 400 });

  const userEmail = session.user.email.toLowerCase().trim();
  const tokenHash = hashInvitationToken(token);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.findFirst({
        where: { tokenHash, acceptedById: null, expiresAt: { gt: new Date() } },
      });
      if (!invitation) throw Object.assign(new Error("Invalid or expired invitation"), { code: "INVALID_INVITATION", status: 400 });

      if (invitation.email.toLowerCase().trim() !== userEmail) {
        throw Object.assign(new Error("Email does not match the invitation"), { code: "EMAIL_MISMATCH", status: 403 });
      }

      const existing = await tx.membership.findUnique({
        where: { tenantId_userId: { tenantId: invitation.tenantId, userId: session.user!.id } },
      });
      if (!existing) {
        await tx.membership.create({
          data: { tenantId: invitation.tenantId, userId: session.user!.id, role: invitation.role },
        });
      } else if (existing.role !== invitation.role) {
        await tx.membership.update({
          where: { tenantId_userId: { tenantId: invitation.tenantId, userId: session.user!.id } },
          data: { role: invitation.role },
        });
      }

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { acceptedById: session.user!.id, acceptedAt: new Date() },
      });

      await (tx as any).auditLog.create({
        data: {
          tenantId: invitation.tenantId,
          actorId: session.user!.id,
          action: "INVITATION_ACCEPTED",
          target: invitation.id,
          metadata: { email: userEmail, role: invitation.role },
        },
      });

      const tenant = await tx.tenant.findUniqueOrThrow({
        where: { id: invitation.tenantId },
        select: { slug: true },
      });

      return { tenantId: invitation.tenantId, tenantSlug: tenant.slug };
    });

    return NextResponse.json({ ok: true, tenantId: result.tenantId, tenantSlug: result.tenantSlug });
  } catch (err: any) {
    if (err?.code && err?.status) {
      return NextResponse.json({ ok: false, code: err.code, error: err.message }, { status: err.status });
    }
    return NextResponse.json({ ok: false, code: "INTERNAL_ERROR", error: "Acceptance failed" }, { status: 500 });
  }
}

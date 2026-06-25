import { NextResponse, NextRequest } from "next/server";
import { auth } from "../../../../../../../lib/auth";
import { prisma } from "../../../../../../../lib/prisma";
import {
  changeTenantMemberRole,
  removeTenantMember,
  TenantAdminError,
} from "../../../../../../../lib/tenant-admin-service";
import { TenantAccessError } from "../../../../../../../lib/tenant-access";
import type { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const db = prisma as any;

function handleError(e: unknown) {
  if (e instanceof TenantAccessError) {
    return NextResponse.json({ ok: false, error: { code: e.code, message: e.message } }, { status: e.status });
  }
  if (e instanceof TenantAdminError) {
    return NextResponse.json({ ok: false, error: { code: e.code, message: e.message } }, { status: e.status });
  }
  throw e;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; membershipId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }

    const { slug, membershipId } = await params;
    const tenant = await db.tenant.findUnique({ where: { slug } });
    if (!tenant) {
      return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Tenant not found" } }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || !body.role) {
      return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "role is required" } }, { status: 400 });
    }

    const result = await changeTenantMemberRole(session.user.id, tenant.id, membershipId, {
      role: body.role as UserRole,
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; membershipId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }

    const { slug, membershipId } = await params;
    const tenant = await db.tenant.findUnique({ where: { slug } });
    if (!tenant) {
      return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Tenant not found" } }, { status: 404 });
    }

    await removeTenantMember(session.user.id, tenant.id, membershipId);
    return NextResponse.json({ ok: true, data: null });
  } catch (e) {
    return handleError(e);
  }
}

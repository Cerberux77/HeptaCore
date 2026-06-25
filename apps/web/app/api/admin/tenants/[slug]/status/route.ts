import { NextResponse, NextRequest } from "next/server";
import { auth } from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/prisma";
import {
  changeTenantStatus,
  TenantAdminError,
} from "../../../../../../lib/tenant-admin-service";
import { TenantAccessError, resolveSuperAdminAccess } from "../../../../../../lib/tenant-access";
import type { TenantStatus } from "@prisma/client";

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

const VALID_STATUSES: TenantStatus[] = ["PROVISIONING", "ACTIVE", "SUSPENDED", "ARCHIVED"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    await resolveSuperAdminAccess(session.user.id, db);

    const { slug } = await params;
    const tenant = await db.tenant.findUnique({ where: { slug } });
    if (!tenant) {
      return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Tenant not found" } }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || !body.status) {
      return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "status is required" } }, { status: 400 });
    }

    const newStatus = body.status as TenantStatus;
    if (!VALID_STATUSES.includes(newStatus)) {
      return NextResponse.json({ ok: false, error: { code: "INVALID_STATUS", message: `Invalid status: ${newStatus}` } }, { status: 400 });
    }

    const result = await changeTenantStatus(session.user.id, tenant.id, newStatus);
    return NextResponse.json({ ok: true, data: result });
  } catch (e) {
    return handleError(e);
  }
}

import { NextResponse, NextRequest } from "next/server";
import { auth } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import {
  getAdminTenant,
  updateAdminTenantConfiguration,
  TenantAdminError,
} from "../../../../../lib/tenant-admin-service";
import { TenantAccessError, resolveSuperAdminAccess } from "../../../../../lib/tenant-access";

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

export async function GET(
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

    const result = await getAdminTenant(session.user.id, tenant.id);
    return NextResponse.json({ ok: true, data: result });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(
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
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Invalid JSON body" } }, { status: 400 });
    }

    const config: { name?: string; timezone?: string; locale?: string } = {};
    if (body.name !== undefined) config.name = body.name;
    if (body.timezone !== undefined) config.timezone = body.timezone;
    if (body.locale !== undefined) config.locale = body.locale;

    const result = await updateAdminTenantConfiguration(session.user.id, tenant.id, config);
    return NextResponse.json({ ok: true, data: result });
  } catch (e) {
    return handleError(e);
  }
}

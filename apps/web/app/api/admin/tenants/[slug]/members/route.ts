import { NextResponse, NextRequest } from "next/server";
import { auth } from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/prisma";
import {
  listTenantMembers,
  addTenantMember,
  validatePagination,
  TenantAdminError,
} from "../../../../../../lib/tenant-admin-service";
import { TenantAccessError } from "../../../../../../lib/tenant-access";
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }

    const { slug } = await params;
    const tenant = await db.tenant.findUnique({ where: { slug } });
    if (!tenant) {
      return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Tenant not found" } }, { status: 404 });
    }

    const url = new URL(req.url);
    const pagination = validatePagination({
      page: url.searchParams.has("page") ? Number(url.searchParams.get("page")) : undefined,
      limit: url.searchParams.has("limit") ? Number(url.searchParams.get("limit")) : undefined,
    });
    const result = await listTenantMembers(session.user.id, tenant.id, db, pagination);
    return NextResponse.json({ ok: true, data: result });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }

    const { slug } = await params;
    const tenant = await db.tenant.findUnique({ where: { slug } });
    if (!tenant) {
      return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Tenant not found" } }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || !body.email || !body.role) {
      return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "email and role are required" } }, { status: 400 });
    }

    const member = await addTenantMember(session.user.id, tenant.id, {
      email: body.email,
      role: body.role as UserRole,
    }, db);

    return NextResponse.json({ ok: true, data: member }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}

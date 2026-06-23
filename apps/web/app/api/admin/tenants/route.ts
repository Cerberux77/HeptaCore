import { NextResponse, NextRequest } from "next/server";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import {
  listAdminTenants,
  createAdminTenant,
  normalizeTenantSlug,
  validatePagination,
  TenantAdminError,
} from "../../../../lib/tenant-admin-service";
import { TenantAccessError, resolveSuperAdminAccess } from "../../../../lib/tenant-access";

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

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    await resolveSuperAdminAccess(session.user.id, db);
    const url = new URL(req.url);
    const pagination = validatePagination({
      page: url.searchParams.has("page") ? Number(url.searchParams.get("page")) : undefined,
      limit: url.searchParams.has("limit") ? Number(url.searchParams.get("limit")) : undefined,
    });
    const result = await listAdminTenants(session.user.id, db, pagination);
    return NextResponse.json({ ok: true, data: result });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    await resolveSuperAdminAccess(session.user.id, db);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Invalid JSON body" } }, { status: 400 });
    }

    const { slug, name, ownerEmail, ownerName } = body;
    if (!slug || !name || !ownerEmail) {
      return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "slug, name, and ownerEmail are required" } }, { status: 400 });
    }

    const tenant = await createAdminTenant({
      actorId: session.user.id,
      slug: normalizeTenantSlug(slug),
      name,
      ownerEmail,
      ownerName,
    }, db);

    return NextResponse.json({ ok: true, data: tenant }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}

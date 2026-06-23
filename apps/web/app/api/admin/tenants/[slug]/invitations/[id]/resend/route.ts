import { NextResponse, NextRequest } from "next/server";
import { auth } from "../../../../../../../../lib/auth";
import { prisma } from "../../../../../../../../lib/prisma";
import {
  resendTenantInvitation,
  TenantAdminError,
} from "../../../../../../../../lib/tenant-admin-service";
import { TenantAccessError } from "../../../../../../../../lib/tenant-access";

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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }

    const { slug, id } = await params;
    const tenant = await db.tenant.findUnique({ where: { slug } });
    if (!tenant) {
      return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Tenant not found" } }, { status: 404 });
    }

    const result = await resendTenantInvitation(session.user.id, tenant.id, id);
    return NextResponse.json({ ok: true, data: result });
  } catch (e) {
    return handleError(e);
  }
}

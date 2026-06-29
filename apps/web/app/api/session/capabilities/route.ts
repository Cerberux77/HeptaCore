import { NextResponse, NextRequest } from "next/server";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { resolveSessionCapabilities, SessionCapabilityError } from "../../../../lib/session-capabilities";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "No autenticado" } },
        { status: 401 },
      );
    }

    const tenantSlug = req.nextUrl.searchParams.get("tenant");

    const data = await resolveSessionCapabilities(session.user.id, tenantSlug, prisma as any);

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    if (e instanceof SessionCapabilityError) {
      return NextResponse.json(
        { ok: false, error: { code: e.code, message: e.message } },
        { status: e.status },
      );
    }
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: "Error al cargar capacidades" } },
      { status: 500 },
    );
  }
}

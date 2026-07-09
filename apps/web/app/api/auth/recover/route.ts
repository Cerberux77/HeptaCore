import { NextResponse, NextRequest } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { resolvePublicOrigin } from "../../../../lib/url-origin";
import { requestPasswordReset, PasswordResetError } from "../../../../lib/password-reset-service";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  try {
    const result = await prisma.$transaction((tx) => requestPasswordReset(body, tx));
    const origin = resolvePublicOrigin(req.nextUrl.origin);
    const debugResetLink = process.env.HEPTACORE_EXPOSE_RESET_LINKS === "1" && result.token
      ? `${origin}/reset-password?token=${encodeURIComponent(result.token)}`
      : null;

    return NextResponse.json({
      ok: true,
      ...(debugResetLink ? { debugResetLink } : {}),
    });
  } catch (error) {
    if (error instanceof PasswordResetError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Recovery request failed" }, { status: 500 });
  }
}

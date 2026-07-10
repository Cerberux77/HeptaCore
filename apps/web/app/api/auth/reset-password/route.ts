import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { consumePasswordResetToken, PasswordResetError } from "../../../../lib/password-reset-service";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  try {
    await prisma.$transaction((tx) => consumePasswordResetToken(body, tx));
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PasswordResetError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Password reset failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

function verifyResetToken(token: string): { userId: string } | null {
  try {
    const [encoded, sig] = token.split(".");
    if (!encoded || !sig) return null;

    const hmac = crypto.createHmac("sha256", process.env.AUTH_SECRET || "heptacore-dev");
    const expectedSig = hmac.update(encoded).digest("base64url");
    if (sig !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString());
    if (payload.exp < Date.now()) return null;
    if (!payload.userId) return null;

    return { userId: payload.userId };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.token !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "token and password are required" }, { status: 400 });
  }

  const { token, password } = body as { token: string; password: string };

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const verified = verifyResetToken(token);
  if (!verified) {
    return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: verified.userId },
    data: { passwordHash },
  });

  return NextResponse.json({ ok: true });
}

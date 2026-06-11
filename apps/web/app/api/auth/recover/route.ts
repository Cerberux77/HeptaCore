import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import crypto from "crypto";

function createResetToken(userId: string): string {
  const payload = JSON.stringify({ userId, exp: Date.now() + 3600000 });
  const encoded = Buffer.from(payload).toString("base64url");
  const hmac = crypto.createHmac("sha256", process.env.AUTH_SECRET || "heptacore-dev");
  const sig = hmac.update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.email !== "string") {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const email = body.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return NextResponse.json({ ok: true });
  }

  const token = createResetToken(user.id);
  const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || "http://localhost:3000";
  const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

  return NextResponse.json({ ok: true, resetLink });
}

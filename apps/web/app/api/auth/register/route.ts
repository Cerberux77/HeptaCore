import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.token !== "string" || typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "token, email and password are required" }, { status: 400 });
  }

  const { token, email, name, password } = body as { token: string; email: string; name?: string; password: string };

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const invitation = await prisma.invitation.findFirst({
    where: { tokenHash, acceptedById: null, expiresAt: { gt: new Date() } },
  });

  if (!invitation) {
    return NextResponse.json({ error: "Invalid or expired invitation token" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  if (invitation.email !== normalizedEmail) {
    return NextResponse.json({ error: "Email does not match the invitation" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      name: name || normalizedEmail.split("@")[0],
      passwordHash,
      memberships: {
        create: {
          tenantId: invitation.tenantId,
          role: invitation.role,
        },
      },
    },
  });

  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { acceptedById: user.id, acceptedAt: new Date() },
  });

  return NextResponse.json({ ok: true, userId: user.id });
}

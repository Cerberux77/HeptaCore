import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import {
  acceptRegistrationInvitation,
  InvitationAcceptanceError,
} from "../../../../lib/invitation-acceptance-service";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.token !== "string" || typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ ok: false, code: "INVALID_REQUEST", error: "token, email and password are required" }, { status: 400 });
  }

  const { token, email, name, password } = body as { token: string; email: string; name?: string; password: string };

  try {
    const result = await prisma.$transaction((tx) =>
      acceptRegistrationInvitation({ token, email, password, name }, tx),
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof InvitationAcceptanceError) {
      return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, code: "INTERNAL_ERROR", error: "Registration failed" }, { status: 500 });
  }
}

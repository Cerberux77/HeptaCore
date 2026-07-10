import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import {
  acceptRegistrationInvitation,
  InvitationAcceptanceError,
} from "../../../../lib/invitation-acceptance-service";
import { z } from "zod";

const RegisterRequestSchema = z.object({
  token: z.string().trim().min(1),
  email: z.string().trim().email(),
  name: z.string().trim().min(1).optional(),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
}).superRefine((value, ctx) => {
  if (value.password !== value.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["confirmPassword"],
      message: "Passwords do not match",
    });
  }
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = RegisterRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, code: "INVALID_REQUEST", error: "token, email, password and confirmPassword are required" }, { status: 400 });
  }

  const { token, email, name, password, confirmPassword } = parsed.data;

  try {
    const result = await prisma.$transaction((tx) =>
      acceptRegistrationInvitation({ token, email, password, confirmPassword, name }, tx),
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof InvitationAcceptanceError) {
      return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, code: "INTERNAL_ERROR", error: "Registration failed" }, { status: 500 });
  }
}

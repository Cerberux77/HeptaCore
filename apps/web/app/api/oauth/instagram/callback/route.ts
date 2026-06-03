import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorReason = searchParams.get("error_reason");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        provider: "instagram",
        error,
        errorReason,
        errorDescription
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    provider: "instagram",
    codeReceived: Boolean(code),
    state,
    message: "Callback received. Token exchange not implemented yet."
  });
}

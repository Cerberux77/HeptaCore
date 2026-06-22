import { NextResponse } from "next/server";

export async function PATCH() {
  return NextResponse.json({
    ok: false,
    code: "LEGACY_ASSET_WRITE_DISABLED",
    error: "Use tenant-scoped asset APIs.",
  }, { status: 410 });
}

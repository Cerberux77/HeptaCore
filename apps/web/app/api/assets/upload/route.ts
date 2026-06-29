import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    ok: false,
    code: "LEGACY_ASSET_WRITE_DISABLED",
    error: "Use tenant-scoped asset upload APIs.",
  }, { status: 410 });
}

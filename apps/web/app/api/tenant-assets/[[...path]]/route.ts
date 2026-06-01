import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const root = process.cwd().replace(/\\apps\\web$/, "");
const assetRoot = path.resolve(root, "examples", "tenants", "turpial", "content", "inbox");

const contentTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp4": "video/mp4"
};

export async function GET(_: Request, context: { params: Promise<{ path?: string[] }> }) {
  const params = await context.params;
  const parts = params.path ?? [];
  const target = path.resolve(assetRoot, ...parts);

  if (!target.startsWith(assetRoot)) {
    return NextResponse.json({ error: "Invalid asset path" }, { status: 400 });
  }

  try {
    const file = await fs.readFile(target);
    const ext = path.extname(target).toLowerCase();
    return new NextResponse(file, {
      headers: {
        "Content-Type": contentTypes[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=60"
      }
    });
  } catch {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }
}

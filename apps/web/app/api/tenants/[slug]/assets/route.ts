import { NextResponse } from "next/server";
import { auth } from "../../../../../lib/auth";
import { serializeTenantAsset } from "../../../../../lib/asset-presentation";
import { AssetServiceError, listTenantAssets, uploadTenantAsset } from "../../../../../lib/asset-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function jsonError(error: unknown) {
  if (error instanceof AssetServiceError) {
    return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: error.status });
  }
  return NextResponse.json({ ok: false, code: "ASSET_ERROR", error: "Asset operation failed." }, { status: 500 });
}

function parseJsonField(value: FormDataEntryValue | null): unknown {
  if (typeof value !== "string" || !value.trim()) return undefined;
  return JSON.parse(value);
}

export async function GET(_: Request, context: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { slug } = await context.params;
  try {
    const assets = await listTenantAssets({ tenantSlug: slug, userId: session.user.id });
    return NextResponse.json({ ok: true, assets: assets.map((asset: any) => serializeTenantAsset(asset, slug)) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: Request, context: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { slug } = await context.params;
  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, code: "ASSET_FILE_REQUIRED", error: "file is required." }, { status: 400 });
  }
  try {
    const asset = await uploadTenantAsset({
      tenantSlug: slug,
      userId: session.user.id,
      file,
      folder: formData?.get("folder") ? String(formData.get("folder")) : "",
      projectId: formData?.get("projectId") ? String(formData.get("projectId")) : null,
      technicalMetadata: parseJsonField(formData?.get("technicalMetadata") ?? null),
    });
    return NextResponse.json({ ok: true, asset: serializeTenantAsset({ ...asset, _count: { drafts: 0 } }, slug) });
  } catch (error) {
    return jsonError(error);
  }
}

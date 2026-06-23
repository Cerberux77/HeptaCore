import { NextResponse } from "next/server";
import { auth } from "../../../../../../lib/auth";
import { serializeTenantAsset } from "../../../../../../lib/asset-presentation";
import { AssetServiceError, deleteTenantAsset, updateTenantAssetMetadata } from "../../../../../../lib/asset-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function jsonError(error: unknown) {
  if (error instanceof AssetServiceError) {
    return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: error.status });
  }
  return NextResponse.json({ ok: false, code: "ASSET_ERROR", error: "Asset operation failed." }, { status: 500 });
}

export async function PATCH(req: Request, context: { params: Promise<{ slug: string; assetId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { slug, assetId } = await context.params;
  const body = await req.json().catch(() => null) as { filename?: string; folder?: string | null; technicalMetadata?: unknown } | null;
  if (!body) return NextResponse.json({ ok: false, error: "Request body is required." }, { status: 400 });
  try {
    const asset = await updateTenantAssetMetadata({
      tenantSlug: slug,
      userId: session.user.id,
      assetId,
      filename: body.filename,
      folder: body.folder,
      technicalMetadata: body.technicalMetadata,
    });
    return NextResponse.json({ ok: true, asset: serializeTenantAsset(asset, slug) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ slug: string; assetId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { slug, assetId } = await context.params;
  try {
    await deleteTenantAsset({ tenantSlug: slug, userId: session.user.id, assetId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

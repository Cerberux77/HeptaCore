import { NextResponse } from "next/server";
import { auth } from "../../../../../../lib/auth";
import { resolveAssetUrl } from "../../../../../../lib/asset-resolution";
import { AssetServiceError, deleteTenantAsset, updateTenantAssetMetadata } from "../../../../../../lib/asset-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function jsonError(error: unknown) {
  if (error instanceof AssetServiceError) {
    return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: error.status });
  }
  return NextResponse.json({ ok: false, code: "ASSET_ERROR", error: "Asset operation failed." }, { status: 500 });
}

function serializeAsset(asset: any, tenantSlug: string) {
  const metadata = asset.metadata && typeof asset.metadata === "object" ? asset.metadata : {};
  return {
    id: asset.id,
    filename: asset.filename,
    kind: asset.kind,
    path: resolveAssetUrl(asset, tenantSlug),
    sourcePath: asset.sourcePath,
    storageKey: asset.storageKey,
    mimeType: asset.mimeType,
    rightsStatus: asset.rightsStatus,
    metadata,
    folder: metadata.folder ?? "",
    sizeBytes: metadata.sizeBytes ?? null,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    durationSeconds: metadata.durationSeconds ?? null,
  };
}

export async function PATCH(req: Request, context: { params: Promise<{ slug: string; assetId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { slug, assetId } = await context.params;
  const body = await req.json().catch(() => null) as { filename?: string; folder?: string | null } | null;
  if (!body) return NextResponse.json({ ok: false, error: "Request body is required." }, { status: 400 });
  try {
    const asset = await updateTenantAssetMetadata({
      tenantSlug: slug,
      userId: session.user.id,
      assetId,
      filename: body.filename,
      folder: body.folder,
    });
    return NextResponse.json({ ok: true, asset: serializeAsset(asset, slug) });
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

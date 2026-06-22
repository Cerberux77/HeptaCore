import { NextResponse } from "next/server";
import { auth } from "../../../../../lib/auth";
import { resolveAssetUrl } from "../../../../../lib/asset-resolution";
import { AssetServiceError, listTenantAssets, uploadTenantAsset } from "../../../../../lib/asset-service";

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
    draftCount: asset._count?.drafts ?? 0,
    metadata,
    folder: metadata.folder ?? "",
    sizeBytes: metadata.sizeBytes ?? null,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    durationSeconds: metadata.durationSeconds ?? null,
  };
}

export async function GET(_: Request, context: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { slug } = await context.params;
  try {
    const assets = await listTenantAssets({ tenantSlug: slug, userId: session.user.id });
    return NextResponse.json({ ok: true, assets: assets.map((asset: any) => serializeAsset(asset, slug)) });
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
    });
    return NextResponse.json({ ok: true, asset: serializeAsset({ ...asset, _count: { drafts: 0 } }, slug) });
  } catch (error) {
    return jsonError(error);
  }
}

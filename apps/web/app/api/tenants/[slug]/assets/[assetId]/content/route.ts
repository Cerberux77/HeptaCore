import { NextResponse } from "next/server";
import { auth } from "../../../../../../../lib/auth";
import { resolveAssetUrl } from "../../../../../../../lib/asset-resolution";
import { AssetServiceError, replaceTenantAssetContent } from "../../../../../../../lib/asset-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function jsonError(error: unknown) {
  if (error instanceof AssetServiceError) {
    return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: error.status });
  }
  return NextResponse.json({ ok: false, code: "ASSET_REPLACE_FAILED", error: "Asset replacement failed." }, { status: 500 });
}

export async function PUT(req: Request, context: { params: Promise<{ slug: string; assetId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { slug, assetId } = await context.params;
  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, code: "ASSET_FILE_REQUIRED", error: "file is required." }, { status: 400 });
  }
  try {
    const asset = await replaceTenantAssetContent({
      tenantSlug: slug,
      userId: session.user.id,
      assetId,
      file,
      expectedStorageKey: formData?.get("expectedStorageKey") ? String(formData.get("expectedStorageKey")) : null,
    });
    const metadata = asset.metadata && typeof asset.metadata === "object" ? asset.metadata as Record<string, unknown> : {};
    return NextResponse.json({
      ok: true,
      asset: {
        id: asset.id,
        filename: asset.filename,
        kind: asset.kind,
        path: resolveAssetUrl(asset, slug),
        sourcePath: asset.sourcePath,
        storageKey: asset.storageKey,
        mimeType: asset.mimeType,
        rightsStatus: asset.rightsStatus,
        metadata,
        folder: metadata.folder ?? "",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

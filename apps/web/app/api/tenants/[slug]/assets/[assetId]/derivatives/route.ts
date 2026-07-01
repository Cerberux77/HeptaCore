import { NextResponse } from "next/server";
import { auth } from "../../../../../../../lib/auth";
import { type AssetFormatDerivativePlan } from "../../../../../../../lib/asset-format-derivatives";
import { serializeTenantAsset } from "../../../../../../../lib/asset-presentation";
import { AssetServiceError, createTenantAssetDerivatives } from "../../../../../../../lib/asset-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function jsonError(error: unknown) {
  if (error instanceof AssetServiceError) {
    return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: error.status });
  }
  return NextResponse.json({ ok: false, code: "ASSET_ERROR", error: "Asset derivative operation failed." }, { status: 500 });
}

export async function POST(req: Request, context: { params: Promise<{ slug: string; assetId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null) as { plans?: AssetFormatDerivativePlan[] } | null;
  if (!body?.plans?.length) {
    return NextResponse.json({ ok: false, code: "ASSET_DERIVATIVE_REQUIRED", error: "plans is required." }, { status: 400 });
  }

  const { slug, assetId } = await context.params;
  try {
    const assets = await createTenantAssetDerivatives({
      tenantSlug: slug,
      userId: session.user.id,
      assetId,
      plans: body.plans,
    });
    return NextResponse.json({
      ok: true,
      assets: assets.map((asset) => serializeTenantAsset(asset, slug)),
    });
  } catch (error) {
    return jsonError(error);
  }
}

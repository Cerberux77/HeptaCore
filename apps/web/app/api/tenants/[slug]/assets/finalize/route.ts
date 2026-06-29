import { NextResponse } from "next/server";
import { auth } from "../../../../../../lib/auth";
import { serializeTenantAsset } from "../../../../../../lib/asset-presentation";
import { AssetServiceError, finalizeTenantAssetFromBlob } from "../../../../../../lib/asset-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type FinalizeRequestBody = {
  pathname?: unknown;
  url?: unknown;
  contentType?: unknown;
  size?: unknown;
  filename?: unknown;
  folder?: unknown;
  technicalMetadata?: unknown;
};

function jsonError(error: unknown) {
  if (error instanceof AssetServiceError) {
    return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "Asset finalize failed.";
  return NextResponse.json({ ok: false, code: "ASSET_FINALIZE_FAILED", error: message }, { status: 400 });
}

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { slug } = await context.params;
  const body = (await request.json().catch(() => null)) as FinalizeRequestBody | null;
  if (!body) return NextResponse.json({ ok: false, error: "Invalid finalize request." }, { status: 400 });

  if (
    typeof body.pathname !== "string" ||
    typeof body.url !== "string" ||
    typeof body.contentType !== "string" ||
    typeof body.filename !== "string"
  ) {
    return NextResponse.json({ ok: false, error: "pathname, url, contentType, and filename are required." }, { status: 400 });
  }

  const size = Number(body.size ?? 0);
  if (!Number.isFinite(size) || size <= 0) {
    return NextResponse.json({ ok: false, error: "size must be a positive number." }, { status: 400 });
  }

  try {
    const asset = await finalizeTenantAssetFromBlob({
      tenantSlug: slug,
      userId: session.user.id,
      pathname: body.pathname,
      url: body.url,
      contentType: body.contentType,
      sizeBytes: size,
      originalFilename: body.filename,
      folder: typeof body.folder === "string" ? body.folder : "",
      technicalMetadata: body.technicalMetadata,
    });
    return NextResponse.json({ ok: true, asset: serializeTenantAsset(asset, slug) });
  } catch (error) {
    return jsonError(error);
  }
}

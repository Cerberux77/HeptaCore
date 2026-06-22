import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { auth } from "../../../../../../../../lib/auth";
import { ASSET_UPLOAD_LIMITS, validateAssetFile } from "../../../../../../../../lib/asset-config";
import { prisma } from "../../../../../../../../lib/prisma";
import { AssetServiceError, replaceTenantAssetWithBlob } from "../../../../../../../../lib/asset-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function jsonError(error: unknown) {
  if (error instanceof AssetServiceError) {
    return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "Replacement upload failed.";
  return NextResponse.json({ ok: false, code: "ASSET_REPLACE_UPLOAD_FAILED", error: message }, { status: 400 });
}

export async function POST(request: Request, context: { params: Promise<{ slug: string; assetId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { slug, assetId } = await context.params;
  const body = (await request.json().catch(() => null)) as HandleUploadBody | null;
  if (!body) return NextResponse.json({ ok: false, error: "Invalid upload request." }, { status: 400 });

  try {
    const response = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const tenant = await prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
        if (!tenant) throw new AssetServiceError("TENANT_NOT_FOUND", "Tenant not found.", 404);
        const membership = await prisma.membership.findUnique({
          where: { tenantId_userId: { tenantId: tenant.id, userId: session.user.id } },
          select: { role: true },
        });
        if (!membership || !["OWNER", "ADMIN", "EDITOR", "STRATEGIST", "PUBLISHER", "SUPER_ADMIN", "TENANT_ADMIN"].includes(membership.role)) {
          throw new AssetServiceError("FORBIDDEN", "Forbidden.", 403);
        }
        const asset = await prisma.asset.findFirst({
          where: { id: assetId, tenantId: tenant.id },
          select: { storageKey: true },
        });
        if (!asset) throw new AssetServiceError("ASSET_NOT_FOUND", "Asset not found.", 404);

        const payload = clientPayload ? JSON.parse(clientPayload) as Record<string, unknown> : {};
        const originalFilename = String(payload.originalFilename ?? pathname);
        const mimeType = String(payload.mimeType ?? "");
        const sizeBytes = Number(payload.sizeBytes ?? 0);
        const validation = validateAssetFile({ filename: originalFilename, mimeType, sizeBytes });
        if (!validation.ok) throw new AssetServiceError(validation.code, validation.error, 400);

        const expectedPrefix = `tenants/${tenant.id}/assets/`;
        if (!pathname.startsWith(expectedPrefix) || pathname.includes("..") || pathname !== pathname.replace(/\\/g, "/")) {
          throw new AssetServiceError("ASSET_STORAGE_SCOPE", "Invalid tenant asset pathname.", 400);
        }

        return {
          allowedContentTypes: ASSET_UPLOAD_LIMITS.acceptedMimeTypes,
          maximumSizeInBytes: ASSET_UPLOAD_LIMITS.maxSizeBytes,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({
            originalFilename,
            mimeType,
            sizeBytes,
            expectedStorageKey: payload.expectedStorageKey ?? asset.storageKey ?? null,
            technicalMetadata: payload.technicalMetadata ?? null,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const payload = tokenPayload ? JSON.parse(tokenPayload) as Record<string, unknown> : {};
        try {
          await replaceTenantAssetWithBlob({
            tenantSlug: slug,
            userId: session.user.id,
            assetId,
            originalFilename: String(payload.originalFilename ?? blob.pathname),
            mimeType: String(payload.mimeType ?? blob.contentType ?? ""),
            sizeBytes: Number(payload.sizeBytes ?? 0),
            sourcePath: blob.url,
            storageKey: blob.pathname,
            expectedStorageKey: typeof payload.expectedStorageKey === "string" ? payload.expectedStorageKey : null,
            technicalMetadata: payload.technicalMetadata ?? null,
          });
        } catch (error) {
          await del(blob.pathname).catch(() => undefined);
          throw error;
        }
      },
    });
    return NextResponse.json(response);
  } catch (error) {
    return jsonError(error);
  }
}

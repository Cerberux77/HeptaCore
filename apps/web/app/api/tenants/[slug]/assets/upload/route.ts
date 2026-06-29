import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "../../../../../../lib/auth";
import { ASSET_UPLOAD_LIMITS, sanitizeFilename, validateAssetFile } from "../../../../../../lib/asset-config";
import { prisma } from "../../../../../../lib/prisma";
import { AssetServiceError, finalizeTenantAssetFromBlob } from "../../../../../../lib/asset-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function jsonError(error: unknown) {
  if (error instanceof AssetServiceError) {
    return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "Upload failed.";
  return NextResponse.json({ ok: false, code: "ASSET_UPLOAD_FAILED", error: message }, { status: 400 });
}

function isUploadCompletedEvent(body: HandleUploadBody): body is Extract<HandleUploadBody, { type: "blob.upload-completed" }> {
  return body.type === "blob.upload-completed";
}

function parseJsonObject(value: string | null | undefined, code: string): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    throw new AssetServiceError(code, "Invalid upload payload.", 400);
  }
}

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const body = (await request.json().catch(() => null)) as HandleUploadBody | null;
  if (!body) return NextResponse.json({ ok: false, error: "Invalid upload request." }, { status: 400 });

  const session = isUploadCompletedEvent(body) ? null : await auth();
  if (!isUploadCompletedEvent(body) && !session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const response = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!session?.user?.id) throw new AssetServiceError("UNAUTHORIZED", "Unauthorized", 401);

        const tenant = await prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
        if (!tenant) throw new AssetServiceError("TENANT_NOT_FOUND", "Tenant not found.", 404);
        const membership = await prisma.membership.findUnique({
          where: { tenantId_userId: { tenantId: tenant.id, userId: session.user.id } },
          select: { role: true },
        });
        if (!membership || !["OWNER", "ADMIN", "EDITOR", "STRATEGIST", "PUBLISHER", "SUPER_ADMIN", "TENANT_ADMIN"].includes(membership.role)) {
          throw new AssetServiceError("FORBIDDEN", "Forbidden.", 403);
        }

        const payload = parseJsonObject(clientPayload, "ASSET_UPLOAD_PAYLOAD_INVALID");
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
            folder: payload.folder ?? "",
            projectId: payload.projectId ?? null,
            technicalMetadata: payload.technicalMetadata ?? null,
            userId: session.user.id,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const payload = parseJsonObject(tokenPayload, "ASSET_UPLOAD_TOKEN_INVALID");
        const userId = typeof payload.userId === "string" ? payload.userId : null;
        if (!userId) throw new AssetServiceError("ASSET_CALLBACK_UNAUTHORIZED", "Upload completion missing actor.", 401);

        await finalizeTenantAssetFromBlob({
          tenantSlug: slug,
          userId,
          originalFilename: String(payload.originalFilename ?? sanitizeFilename(blob.pathname)),
          contentType: String(payload.mimeType ?? blob.contentType ?? ""),
          sizeBytes: Number(payload.sizeBytes ?? 0),
          pathname: blob.pathname,
          url: blob.url,
          folder: String(payload.folder ?? ""),
          projectId: typeof payload.projectId === "string" ? payload.projectId : null,
          technicalMetadata: payload.technicalMetadata ?? null,
        });
      },
    });
    return NextResponse.json(response);
  } catch (error) {
    return jsonError(error);
  }
}

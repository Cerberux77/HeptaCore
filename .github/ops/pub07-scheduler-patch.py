from pathlib import Path
import sys

root = Path(sys.argv[1])
test_source = Path(sys.argv[2])

def replace_once(path: Path, old: str, new: str):
    text = path.read_text()
    if old not in text:
        raise SystemExit(f"expected fragment not found in {path}: {old[:120]!r}")
    if text.count(old) != 1:
        raise SystemExit(f"expected exactly one fragment in {path}, found {text.count(old)}")
    path.write_text(text.replace(old, new, 1))

contract = root / "contracts/S-HC-PUB-04/pub04-contract.ts"
replace_once(contract,
'''export interface Pub04Asset {\n  kind: "IMAGE" | "VIDEO";\n  publicUrl: string | null;\n}''',
'''export interface Pub04Asset {\n  kind: "IMAGE" | "VIDEO";\n  publicUrl: string | null;\n  role?: string | null;\n}''')
replace_once(contract,
'''export interface Pub04Publisher {\n  textOnly: boolean;\n  supportedFormats: readonly string[];\n  requiredScopes: readonly string[];\n  publish(input: {\n    targetId: string;\n    accessToken: string;\n    caption: string;\n    mediaUrl?: string;\n    mediaType?: "IMAGE" | "VIDEO";\n  }): Promise<''',
'''export interface Pub04Publisher {\n  textOnly: boolean;\n  credentialLabel: string;\n  supportedFormats: readonly string[];\n  requiredScopes: readonly string[];\n  publish(input: {\n    targetId: string;\n    accessToken: string;\n    caption: string;\n    mediaUrl?: string;\n    mediaType?: "IMAGE" | "VIDEO";\n    format?: string | null;\n    title?: string | null;\n    description?: string | null;\n    thumbnailUrl?: string | null;\n  }): Promise<''')
replace_once(contract,
'''  resolveCredential(input: {\n    tenantId: string;\n    provider: string;\n    socialAccountId: string;\n  }): Promise<''',
'''  resolveCredential(input: {\n    tenantId: string;\n    provider: string;\n    socialAccountId: string;\n    credentialLabel: string;\n  }): Promise<''')

executor = root / "apps/web/lib/publishing-cron-executor.ts"
replace_once(executor,
'''  const credential = await deps.resolveCredential({\n    tenantId: job.tenantId,\n    provider: job.provider,\n    socialAccountId: account.id,\n  });''',
'''  const credential = await deps.resolveCredential({\n    tenantId: job.tenantId,\n    provider: job.provider,\n    socialAccountId: account.id,\n    credentialLabel: publisher.credentialLabel,\n  });''')
replace_once(executor,
'''  const mediaAsset = ctx.draft?.assets?.find((a) => a.publicUrl?.startsWith("https://"));\n  const mediaUrl = mediaAsset?.publicUrl ?? undefined;''',
'''  const mediaAsset = ctx.draft?.assets?.find(\n    (a) => a.role !== "thumbnail" && a.publicUrl?.startsWith("https://")\n  );\n  const thumbnailAsset = ctx.draft?.assets?.find(\n    (a) => a.role === "thumbnail" && a.kind === "IMAGE" && a.publicUrl?.startsWith("https://")\n  );\n  const mediaUrl = mediaAsset?.publicUrl ?? undefined;\n  const thumbnailUrl = thumbnailAsset?.publicUrl ?? undefined;''')
replace_once(executor,
'''      caption: ctx.draft?.caption ?? ctx.draft?.title ?? "",\n      mediaUrl,\n      mediaType: mediaAsset ? (mediaAsset.kind === "VIDEO" ? "VIDEO" : "IMAGE") : undefined,''',
'''      caption: ctx.draft?.caption ?? ctx.draft?.title ?? "",\n      mediaUrl,\n      mediaType: mediaAsset ? (mediaAsset.kind === "VIDEO" ? "VIDEO" : "IMAGE") : undefined,\n      format: ctx.draft?.format ?? null,\n      title: ctx.draft?.title ?? null,\n      description: ctx.draft?.caption ?? null,\n      thumbnailUrl,''')

route = root / "apps/web/app/api/cron/publisher/route.ts"
replace_once(route,
'''  return {\n    textOnly: raw.capabilities.textOnly,\n    supportedFormats: ["FACEBOOK_FEED", "INSTAGRAM_FEED"],\n    requiredScopes: raw.requiredScopes,\n    async publish(input) {\n      const result = await raw.publish({\n        targetId: input.targetId,\n        accessToken: input.accessToken,\n        caption: input.caption,\n        mediaUrl: input.mediaUrl,\n        mediaType: input.mediaType,\n      });\n      return { kind: "success", externalPostId: result.externalPostId, providerResponse: result.providerResponse };\n    },\n  };''',
'''  return {\n    textOnly: raw.capabilities.textOnly,\n    credentialLabel: raw.credentialLabel,\n    supportedFormats: raw.supportedFormats,\n    requiredScopes: raw.requiredScopes,\n    async publish(input) {\n      try {\n        const result = await raw.publish({\n          targetId: input.targetId,\n          accessToken: input.accessToken,\n          caption: input.caption,\n          mediaUrl: input.mediaUrl,\n          mediaType: input.mediaType,\n          format: input.format,\n          title: input.title,\n          description: input.description,\n          thumbnailUrl: input.thumbnailUrl,\n        });\n        return { kind: "success", externalPostId: result.externalPostId, providerResponse: result.providerResponse };\n      } catch (error) {\n        const candidate = error as { message?: string; isAmbiguous?: boolean; meta?: { httpStatus?: number } };\n        const message = candidate?.message || "Publisher failed";\n        if (candidate?.isAmbiguous) return { kind: "ambiguous", error: message };\n        if (candidate?.meta?.httpStatus === 429) return { kind: "retryable_failure", error: message };\n        return { kind: "terminal_failure", error: message };\n      }\n    },\n  };''')
replace_once(route,
'''            assets: draft.assets.map((da) => ({\n              kind: da.asset.kind as "IMAGE" | "VIDEO",\n              publicUrl: buildPublicAssetUrl(tenantSlug, da.asset),\n            })),''',
'''            assets: draft.assets.map((da) => ({\n              kind: da.asset.kind as "IMAGE" | "VIDEO",\n              publicUrl: buildPublicAssetUrl(tenantSlug, da.asset),\n              role: da.role,\n            })),''')
replace_once(route,
'''    async resolveCredential({ tenantId, provider, socialAccountId }) {\n      const result = await resolveAndDecryptOAuthCredential({\n        tenantId,\n        provider,\n        socialAccountId,\n        credentialLabel: "facebook_page_oauth",\n      });''',
'''    async resolveCredential({ tenantId, provider, socialAccountId, credentialLabel }) {\n      const result = await resolveAndDecryptOAuthCredential({\n        tenantId,\n        provider,\n        socialAccountId,\n        credentialLabel,\n      });''')

test_target = root / "apps/web/lib/__tests__/pub07-scheduled.test.ts"
test_target.parent.mkdir(parents=True, exist_ok=True)
test_target.write_text(test_source.read_text())
print("PUB07_SCHEDULER_PATCH_APPLIED")

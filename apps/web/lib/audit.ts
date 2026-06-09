import { prisma } from "./prisma";

export async function auditLog(params: {
  tenantId?: string;
  actorId: string;
  action: string;
  target?: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      tenantId: params.tenantId || null,
      actorId: params.actorId,
      action: params.action,
      target: params.target || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metadata: (params.metadata ?? undefined) as any,
    },
  });
}

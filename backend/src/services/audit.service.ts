import { prisma } from "../config/prisma";

export async function logAudit(params: {
  actorId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  description?: string;
  metadata?: any;
  ipAddress?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        description: params.description,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        ipAddress: params.ipAddress,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}

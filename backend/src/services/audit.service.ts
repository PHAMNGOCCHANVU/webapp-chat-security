import { prisma } from "../config/prisma";

export async function logAudit(params: {
  actorId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  description?: string;
  metadata?: any;
  ipAddress?: string;
  status?: "SUCCESS" | "FAILED";
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: params.actorId,
        actionType: params.action,
        targetTable: params.targetType,
        targetId: params.targetId,
        description: params.description,
        ipAddress: params.ipAddress,
        actionStatus: params.status || "SUCCESS",
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}

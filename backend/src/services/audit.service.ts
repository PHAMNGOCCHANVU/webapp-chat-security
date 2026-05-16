import { prisma } from "../config/prisma";
import { AuditAction } from "../utils/audit-actions";

export { AuditAction };

export interface AuditLogParams {
  actorId?: string;
  action: AuditAction | string;       // string fallback cho auto-logged HTTP requests
  targetType?: string;
  targetId?: string;
  description?: string;
  metadata?: Record<string, unknown>; // An toàn hơn any
  ipAddress?: string;
  status?: "SUCCESS" | "FAILED";
}

/**
 * Ghi audit log vào database
 * Nếu metadata được cung cấp, nó sẽ được serialize vào field description
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    let description = params.description;

    // Nếu có metadata, gắn vào cuối description dạng JSON
    if (params.metadata && Object.keys(params.metadata).length > 0) {
      const metaStr = JSON.stringify(params.metadata);
      description = description
        ? `${description} | metadata: ${metaStr}`
        : `metadata: ${metaStr}`;
    }

    await prisma.auditLog.create({
      data: {
        actorUserId: params.actorId ?? null,
        actionType: params.action,
        targetTable: params.targetType ?? null,
        targetId: params.targetId ?? null,
        description: description ?? null,
        ipAddress: params.ipAddress ?? null,
        actionStatus: params.status ?? "SUCCESS",
      },
    });
  } catch (error) {
    // Không để lỗi audit log crash ứng dụng chính
    console.error("[AuditLog] Failed to write audit log:", error);
  }
}

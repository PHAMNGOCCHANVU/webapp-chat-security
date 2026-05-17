import type { Request } from "express";
import { prisma } from "../config/prisma";

export type AuditActionStatus = "SUCCESS" | "FAILED";

type AuditContextRequest = Pick<Request, "ip" | "get" | "headers">;

const TARGET_MODULE_MAP: Record<string, string> = {
  ADMIN: "SYSTEM",
  AUDIT: "SYSTEM",
  CONVERSATION: "CONVERSATION",
  CONVERSATIONMEMBER: "MEMBER",
  FRIEND: "FRIEND",
  FRIENDREQUEST: "FRIEND",
  GROUP: "CONVERSATION",
  MEMBER: "MEMBER",
  MESSAGE: "MESSAGE",
  ROLE: "ROLE",
  SESSION: "AUTH",
  SOCKET: "SOCKET",
  USER: "USER",
};

const normalizeAuditString = (value?: string | null) => {
  if (value == null) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normalizeTargetKey = (value?: string | null) => {
  const normalizedValue = normalizeAuditString(value);
  return normalizedValue
    ? normalizedValue.replace(/[^a-zA-Z]/g, "").toUpperCase()
    : "";
};

export const resolveAuditModuleName = (
  action: string,
  targetType?: string | null,
  explicitModule?: string | null
) => {
  const normalizedExplicitModule = normalizeAuditString(explicitModule)?.toUpperCase();
  if (normalizedExplicitModule) {
    return normalizedExplicitModule;
  }

  const targetKey = normalizeTargetKey(targetType);
  if (targetKey && TARGET_MODULE_MAP[targetKey]) {
    return TARGET_MODULE_MAP[targetKey];
  }

  const normalizedAction = action.trim().toUpperCase();

  if (
    normalizedAction.startsWith("LOGIN") ||
    normalizedAction.startsWith("LOGOUT") ||
    normalizedAction === "REGISTER" ||
    normalizedAction === "ACCESS_DENIED" ||
    normalizedAction === "CHANGE_PASSWORD" ||
    normalizedAction === "UPDATE_PROFILE"
  ) {
    return "AUTH";
  }

  if (normalizedAction.includes("ROLE")) {
    return "ROLE";
  }

  if (normalizedAction.includes("USER")) {
    return "USER";
  }

  if (
    normalizedAction.includes("GROUP") ||
    normalizedAction.includes("CONVERSATION") ||
    normalizedAction.includes("ROOM")
  ) {
    return "CONVERSATION";
  }

  if (normalizedAction.includes("MEMBER")) {
    return "MEMBER";
  }

  if (normalizedAction.includes("MESSAGE")) {
    return "MESSAGE";
  }

  if (normalizedAction.includes("FRIEND")) {
    return "FRIEND";
  }

  if (normalizedAction.includes("SOCKET")) {
    return "SOCKET";
  }

  return "SYSTEM";
};

export const getAuditRequestContext = (request?: AuditContextRequest) => ({
  ipAddress: normalizeAuditString(request?.ip),
  userAgent: normalizeAuditString(
    request?.get?.("user-agent") ??
      (typeof request?.headers?.["user-agent"] === "string"
        ? request.headers["user-agent"]
        : undefined)
  ),
});

export async function logAudit(params: {
  actorId?: string;
  action: string;
  module?: string;
  targetType?: string;
  targetId?: string;
  description?: string;
  metadata?: unknown;
  ipAddress?: string;
  userAgent?: string;
  request?: AuditContextRequest;
  status?: AuditActionStatus;
}) {
  try {
    const requestContext = getAuditRequestContext(params.request);

    await prisma.auditLog.create({
      data: {
        actorUserId: params.actorId,
        actionType: params.action.trim().toUpperCase(),
        moduleName: resolveAuditModuleName(params.action, params.targetType, params.module),
        targetTable: normalizeAuditString(params.targetType)?.toUpperCase() ?? null,
        targetId: normalizeAuditString(params.targetId) ?? null,
        description: normalizeAuditString(params.description) ?? null,
        ipAddress: normalizeAuditString(params.ipAddress) ?? requestContext.ipAddress ?? null,
        userAgent: normalizeAuditString(params.userAgent) ?? requestContext.userAgent ?? null,
        actionStatus: params.status || "SUCCESS",
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}

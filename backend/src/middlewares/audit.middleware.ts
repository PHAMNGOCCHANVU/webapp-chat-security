import { Request, Response, NextFunction } from "express";
import { logAudit, AuditAction } from "../services/audit.service";

/**
 * Các HTTP method cần ghi audit log tự động
 */
const AUDITED_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Các path prefix bị loại trừ (không ghi log)
 */
const EXCLUDED_PATHS = [
  "/health",
  "/api-docs",
  "/api-docs.json",
  "/favicon.ico",
];

/**
 * Auto-Audit Middleware
 * Tự động ghi audit log cho mọi request POST/PUT/PATCH/DELETE.
 * Hook vào `res.on("finish")` để bắt status code sau khi handler xử lý xong.
 *
 * PHẢI được đăng ký SAU sessionConfig trong app.ts (cần session để lấy userId)
 * VÀ TRƯỚC các route handlers.
 */
export function auditLogger(req: Request, res: Response, next: NextFunction): void {
  // Bỏ qua nếu không phải method cần audit
  if (!AUDITED_METHODS.has(req.method)) {
    return next();
  }

  // Bỏ qua các path được loại trừ
  const isExcluded = EXCLUDED_PATHS.some((p) => req.path.startsWith(p));
  if (isExcluded) {
    return next();
  }

  // Hook vào sự kiện "finish" — chạy sau khi response được gửi đi
  res.on("finish", () => {
    // Bỏ qua nếu đã có route handler ghi log thủ công riêng
    // (phân biệt bằng cách chỉ log các request tới /api/v1/*)
    if (!req.path.startsWith("/api/v1/")) {
      return;
    }

    const session = (req as any).session;
    const actorId: string | undefined = session?.userId;

    const status = res.statusCode < 400 ? "SUCCESS" : "FAILED";
    const actionType = `${req.method}:${req.path}`;

    logAudit({
      actorId,
      action: AuditAction.HTTP_REQUEST,
      targetType: "API",
      description: `[AUTO] ${actionType} — HTTP ${res.statusCode}`,
      metadata: {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
      },
      ipAddress: req.ip,
      status,
    }).catch(() => {});
  });

  next();
}

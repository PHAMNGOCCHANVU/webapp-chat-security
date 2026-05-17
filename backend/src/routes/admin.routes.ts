import { Router } from "express";
import { AdminController } from "../controllers/admin.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/role.middleware";
import { adminLimiter } from "../config/rate-limit";

const router = Router();

// Apply rate limit, authentication to all routes
router.use(adminLimiter);
router.use(requireAuth);

// Users
/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: Lấy danh sách tất cả user (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get("/users", requirePermission("USER_VIEW"), AdminController.listUsers);
router.get("/users/:id", requirePermission("USER_VIEW"), AdminController.getUser);
router.post("/users", requirePermission("USER_CREATE"), AdminController.createUser);
router.put("/users/:id", requirePermission("USER_UPDATE"), AdminController.updateUser);
router.patch("/users/:id", requirePermission("USER_UPDATE"), AdminController.updateUser);

/**
 * @swagger
 * /api/v1/admin/users/{id}/status:
 *   patch:
 *     summary: Cập nhật trạng thái user (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE, BANNED]
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.patch("/users/:id/status", requirePermission("USER_LOCK"), AdminController.updateUserStatus);
router.patch("/users/:id/lock", requirePermission("USER_LOCK"), AdminController.lockUser);
router.patch("/users/:id/unlock", requirePermission("USER_LOCK"), AdminController.unlockUser);

/**
 * @swagger
 * /api/v1/admin/users/{id}/role:
 *   patch:
 *     summary: Cập nhật role user (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [USER, ADMIN]
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.post("/users/:id/roles", requirePermission("ROLE_ASSIGN"), AdminController.assignRole);
router.delete("/users/:id/roles/:roleName", requirePermission("ROLE_ASSIGN"), AdminController.revokeRole);

/**
 * @swagger
 * /api/v1/admin/users/{id}:
 *   delete:
 *     summary: Xóa user (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa thành công
 */
router.delete("/users/:id", requirePermission("USER_DELETE"), AdminController.deleteUser);

// Roles and permissions
router.get("/permissions", requirePermission("ROLE_VIEW"), AdminController.listPermissions);
router.get("/roles", requirePermission("ROLE_VIEW"), AdminController.listRoles);
router.post("/roles", requirePermission("ROLE_CREATE"), AdminController.createRole);
router.put("/roles/:id", requirePermission("ROLE_UPDATE"), AdminController.updateRole);
router.patch("/roles/:id", requirePermission("ROLE_UPDATE"), AdminController.updateRole);
router.delete("/roles/:id", requirePermission("ROLE_DELETE"), AdminController.deleteRole);

// Conversations
router.get("/conversations", requirePermission("CONVERSATION_VIEW"), AdminController.listConversations);
router.get("/conversations/:id", requirePermission("CONVERSATION_VIEW"), AdminController.getConversation);
router.post("/conversations", requirePermission("CONVERSATION_CREATE"), AdminController.createConversation);
router.post("/conversations/group", requirePermission("CONVERSATION_CREATE"), AdminController.createConversation);
router.put("/conversations/:id", requirePermission("CONVERSATION_UPDATE"), AdminController.updateConversation);
router.patch("/conversations/:id", requirePermission("CONVERSATION_UPDATE"), AdminController.updateConversation);
router.patch("/conversations/:id/status", requirePermission(["CONVERSATION_UPDATE", "CONVERSATION_DELETE"]), AdminController.updateConversationStatus);
router.post("/conversations/:id/members", requirePermission("MEMBER_ADD"), AdminController.addConversationMembers);
router.delete("/conversations/:id/members/:userId", requirePermission("MEMBER_REMOVE"), AdminController.removeConversationMember);

// Audit and stats
/**
 * @swagger
 * /api/v1/admin/audit-logs:
 *   get:
 *     summary: Xem audit logs với bộ lọc nâng cao (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Lọc theo loại hành động (ví dụ LOGIN, REGISTER, ACCESS_DENIED)
 *       - in: query
 *         name: actor
 *         schema:
 *           type: string
 *         description: Lọc theo ID người thực hiện
 *       - in: query
 *         name: targetType
 *         schema:
 *           type: string
 *         description: Lọc theo loại đối tượng (ví dụ users, conversations, API)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [SUCCESS, FAILED]
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-05-01"
 *         description: Từ ngày (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-05-16"
 *         description: Đến ngày (YYYY-MM-DD)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm trong nội dung mô tả (description)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang (bắt đầu từ 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *         description: Số bản ghi mỗi trang (tối đa 100)
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get("/audit-logs", requirePermission("AUDIT_VIEW"), AdminController.getAuditLogs);
router.get("/audit-logs/:id", requirePermission("AUDIT_VIEW"), AdminController.getAuditLog);

/**
 * @swagger
 * /api/v1/admin/stats:
 *   get:
 *     summary: Xem thống kê hệ thống (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get("/stats", requirePermission(["USER_VIEW", "ROLE_VIEW", "CONVERSATION_VIEW", "AUDIT_VIEW"]), AdminController.getSystemStats);

export default router;

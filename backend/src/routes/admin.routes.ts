import { Router } from "express";
import { AdminController } from "../controllers/admin.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/role.middleware";

const router = Router();

router.use(requireAuth);

// Users
router.get("/users", requirePermission("USER_VIEW"), AdminController.listUsers);
router.get("/users/:id", requirePermission("USER_VIEW"), AdminController.getUser);
router.post("/users", requirePermission("USER_CREATE"), AdminController.createUser);
router.put("/users/:id", requirePermission("USER_UPDATE"), AdminController.updateUser);
router.patch("/users/:id", requirePermission("USER_UPDATE"), AdminController.updateUser);
router.patch("/users/:id/status", requirePermission("USER_LOCK"), AdminController.updateUserStatus);
router.patch("/users/:id/lock", requirePermission("USER_LOCK"), AdminController.lockUser);
router.patch("/users/:id/unlock", requirePermission("USER_LOCK"), AdminController.unlockUser);
router.post("/users/:id/roles", requirePermission("ROLE_ASSIGN"), AdminController.assignRole);
router.delete("/users/:id/roles/:roleName", requirePermission("ROLE_ASSIGN"), AdminController.revokeRole);
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
router.get("/audit-logs", requirePermission("AUDIT_VIEW"), AdminController.getAuditLogs);
router.get("/audit-logs/:id", requirePermission("AUDIT_VIEW"), AdminController.getAuditLog);
router.get("/stats", requirePermission(["USER_VIEW", "ROLE_VIEW", "CONVERSATION_VIEW", "AUDIT_VIEW"]), AdminController.getSystemStats);

export default router;

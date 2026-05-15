import { Router } from "express";
import { AdminController } from "../controllers/admin.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";

const router = Router();

// Apply authentication and admin role check to all routes
router.use(requireAuth);
router.use(requireRole("ADMIN"));

// User Management
router.get("/users", AdminController.listUsers);
router.patch("/users/:id/status", AdminController.updateUserStatus);
router.patch("/users/:id/role", AdminController.updateUserRole);
router.delete("/users/:id", AdminController.deleteUser);

// Audit Logs
router.get("/audit-logs", AdminController.getAuditLogs);

// System Stats
router.get("/stats", AdminController.getSystemStats);

export default router;

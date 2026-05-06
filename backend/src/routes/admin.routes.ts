import { Router } from "express";
import { AdminController } from "../controllers/admin.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";

const router = Router();

router.use(requireAuth);
router.use(requireRole("ADMIN"));

router.get("/users", AdminController.listUsers);
router.patch("/users/:id/status", AdminController.updateUserStatus);
router.patch("/users/:id/role", AdminController.updateUserRole);
router.get("/audit-logs", AdminController.getAuditLogs);

export default router;

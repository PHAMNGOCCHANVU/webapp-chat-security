import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/logout", requireAuth, AuthController.logout);
router.get("/me", requireAuth, AuthController.me);
router.get("/users", requireAuth, AuthController.searchUsers);

export default router;

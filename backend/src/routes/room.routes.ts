import { Router } from "express";
import { RoomController } from "../controllers/room.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

router.use(requireAuth);

router.get("/", RoomController.list);
router.post("/", RoomController.create);
router.get("/:id", RoomController.getDetails);
router.get("/:id/messages", RoomController.getMessages);
router.post("/:id/members", RoomController.addMember);
router.delete("/:id/members/:userId", RoomController.removeMember);

export default router;

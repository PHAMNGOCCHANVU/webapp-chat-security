import { Router } from "express";

import { MessageController } from "../controllers/message.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { checkFriendship, checkGroupMembership } from "../middlewares/friend.middleware";

const router = Router();

router.use(requireAuth);

router.post("/direct", checkFriendship, MessageController.sendDirectMessage);
router.post("/group", checkGroupMembership, MessageController.sendGroupMessage);
router.get("/:conversationId", MessageController.getMessages);

export default router;

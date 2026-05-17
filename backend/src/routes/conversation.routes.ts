import { Router } from "express";

import { ConversationController } from "../controllers/conversation.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { checkConversationFriendship } from "../middlewares/friend.middleware";

const router = Router();

router.use(requireAuth);

router.get("/", ConversationController.getConversations);
router.post("/", checkConversationFriendship, ConversationController.createConversation);

export default router;

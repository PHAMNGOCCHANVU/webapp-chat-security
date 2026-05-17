import { Router } from "express";

import { FriendController } from "../controllers/friend.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

router.use(requireAuth);

router.get("/", FriendController.getAllFriends);
router.get("/search", FriendController.searchByUsername);
router.get("/requests", FriendController.getFriendRequests);
router.post("/requests", FriendController.sendFriendRequest);
router.post("/requests/:requestId/accept", FriendController.acceptFriendRequest);
router.post("/requests/:requestId/decline", FriendController.declineFriendRequest);
router.delete("/:friendUserId", FriendController.deleteFriend);

export default router;

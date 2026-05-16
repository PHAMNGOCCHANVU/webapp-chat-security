import { Router } from "express";
import { RoomController } from "../controllers/room.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Room:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         type:
 *           type: string
 *           enum: [DIRECT, GROUP]
 *         createdAt:
 *           type: string
 *           format: date-time
 */

router.use(requireAuth);

/**
 * @swagger
 * /api/v1/rooms:
 *   get:
 *     summary: Lấy danh sách phòng chat của user
 *     tags: [Rooms]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Room'
 */
router.get("/", RoomController.list);

/**
 * @swagger
 * /api/v1/rooms:
 *   post:
 *     summary: Tạo phòng chat mới (Group hoặc Direct)
 *     tags: [Rooms]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [DIRECT, GROUP]
 *               memberIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Tạo phòng thành công
 */
router.post("/", RoomController.create);

/**
 * @swagger
 * /api/v1/rooms/{id}:
 *   get:
 *     summary: Lấy thông tin chi tiết phòng chat
 *     tags: [Rooms]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get("/:id", RoomController.getDetails);

/**
 * @swagger
 * /api/v1/rooms/{id}/messages:
 *   get:
 *     summary: Lấy danh sách tin nhắn trong phòng
 *     tags: [Rooms]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get("/:id/messages", RoomController.getMessages);

/**
 * @swagger
 * /api/v1/rooms/{id}/members:
 *   post:
 *     summary: Thêm thành viên vào phòng (chỉ Group)
 *     tags: [Rooms]
 *     security:
 *       - cookieAuth: []
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
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Thành công
 */
router.post("/:id/members", RoomController.addMember);

/**
 * @swagger
 * /api/v1/rooms/{id}/members/{userId}:
 *   delete:
 *     summary: Xóa thành viên khỏi phòng
 *     tags: [Rooms]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thành công
 */
router.delete("/:id/members/:userId", RoomController.removeMember);

export default router;

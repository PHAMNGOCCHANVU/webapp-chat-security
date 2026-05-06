import { Request, Response } from "express";
import { RoomService, createRoomSchema, addMemberSchema } from "../services/room.service";
import { logAudit } from "../services/audit.service";
import { z } from "zod";

export class RoomController {
  static async list(req: Request, res: Response) {
    try {
      const rooms = await RoomService.listRooms(req.session.userId!);
      res.json(rooms);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const data = createRoomSchema.parse(req.body);
      const room = await RoomService.createRoom(req.session.userId!, data);

      await logAudit({
        actorId: req.session.userId!,
        action: "CREATE_ROOM",
        targetType: "Room",
        targetId: room.id,
        description: `Created room: ${room.name}`,
        ipAddress: req.ip,
      });

      res.status(201).json(room);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
      res.status(400).json({ error: err.message });
    }
  }

  static async getDetails(req: Request, res: Response) {
    try {
      const room = await RoomService.getRoomDetails(req.params.id, req.session.userId!);
      res.json(room);
    } catch (err: any) {
      if (err.message.startsWith("Forbidden")) return res.status(403).json({ error: err.message });
      if (err.message === "Room not found") return res.status(404).json({ error: err.message });
      res.status(500).json({ error: err.message });
    }
  }

  static async getMessages(req: Request, res: Response) {
    try {
      const messages = await RoomService.getMessages(req.params.id, req.session.userId!);
      res.json(messages);
    } catch (err: any) {
      if (err.message.startsWith("Forbidden")) return res.status(403).json({ error: err.message });
      res.status(500).json({ error: err.message });
    }
  }

  static async addMember(req: Request, res: Response) {
    try {
      const data = addMemberSchema.parse(req.body);
      const member = await RoomService.addMember(req.params.id, req.session.userId!, data);

      await logAudit({
        actorId: req.session.userId!,
        action: "ADD_MEMBER",
        targetType: "RoomMember",
        targetId: member.id,
        metadata: { roomId: req.params.id, addedUserId: data.userId },
        ipAddress: req.ip,
      });

      res.status(201).json(member);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
      if (err.message.startsWith("Forbidden")) return res.status(403).json({ error: err.message });
      res.status(400).json({ error: err.message });
    }
  }

  static async removeMember(req: Request, res: Response) {
    try {
      await RoomService.removeMember(req.params.id, req.session.userId!, req.params.userId);

      await logAudit({
        actorId: req.session.userId!,
        action: "REMOVE_MEMBER",
        targetType: "Room",
        targetId: req.params.id,
        metadata: { removedUserId: req.params.userId },
        ipAddress: req.ip,
      });

      res.status(200).json({ message: "Member removed successfully" });
    } catch (err: any) {
      if (err.message.startsWith("Forbidden")) return res.status(403).json({ error: err.message });
      res.status(400).json({ error: err.message });
    }
  }
}

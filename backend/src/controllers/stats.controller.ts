import { Request, Response } from "express";
import { presenceService } from "../services/presence.service";
import { roomService } from "../services/room.service";
import { userService } from "../services/user.service";

export function getHealthController(req: Request, res: Response): void {
    res.status(200).json({
        status: "ok",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
}

export function getStatsController(req: Request, res: Response): void {
    res.status(200).json({
        onlineUsers: presenceService.getOnlineCount(),
        activeRooms: roomService.getActiveRoomCount(),
        queueUsers: userService.getQueueLength(),
        totalUsers: userService.getUserCount(),
    });
}

export function getOnlineCountController(req: Request, res: Response): void {
    res.status(200).json({
        onlineCount: presenceService.getOnlineCount(),
    });
}

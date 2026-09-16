import { Request, Response, NextFunction } from "express";
import { iceServerService } from "../services/iceServer.service";

export async function getIceServersController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const credentials = await iceServerService.getIceServers();
        res.status(200).json(credentials);
    } catch (err) {
        next(err);
    }
}

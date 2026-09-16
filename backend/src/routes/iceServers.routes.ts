import { Router } from "express";
import { getIceServersController } from "../controllers/iceServers.controller";

const router = Router();

// Supports both /ice-servers and /api/ice-servers
router.get("/ice-servers", getIceServersController);
router.get("/api/ice-servers", getIceServersController);

export default router;

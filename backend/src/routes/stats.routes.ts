import { Router } from "express";
import {
    getHealthController,
    getStatsController,
    getOnlineCountController,
} from "../controllers/stats.controller";

const router = Router();

// Health check endpoints
router.get("/health", getHealthController);
router.get("/api/health", getHealthController);

// Stats endpoints
router.get("/api/stats", getStatsController);

// Real-time online count endpoint
router.get("/api/online-count", getOnlineCountController);

export default router;

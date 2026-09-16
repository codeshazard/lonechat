import { Router } from "express";
import iceServersRoutes from "./iceServers.routes";
import statsRoutes from "./stats.routes";

const router = Router();

router.use(iceServersRoutes);
router.use(statsRoutes);

export default router;

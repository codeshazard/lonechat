import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
    logger.error(`Unhandled error on ${req.method} ${req.originalUrl}:`, err);

    if (res.headersSent) {
        return next(err);
    }

    const statusCode = err.status || err.statusCode || 500;
    const message = process.env.NODE_ENV === "production" && statusCode === 500
        ? "Internal Server Error"
        : err.message || "Unknown error";

    res.status(statusCode).json({ error: message });
}

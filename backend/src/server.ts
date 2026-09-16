import http from "http";
import { Server } from "socket.io";
import { createApp } from "./app";
import { config } from "./config";
import { setupSocketHandlers } from "./sockets/socketHandler";
import { logger } from "./utils/logger";

export function createServer() {
    const app = createApp();
    const server = http.createServer(app);

    const io = new Server(server, {
        cors: {
            origin: config.corsOrigin === "*" ? true : config.corsOrigin,
            methods: ["GET", "POST"],
            credentials: true,
        },
        pingTimeout: 20000,
        pingInterval: 25000,
    });

    setupSocketHandlers(io);

    return { app, server, io };
}

export function startServer() {
    const { server } = createServer();

    server.listen(config.port, config.host, () => {
        logger.info(`LoneChat backend running on http://${config.host}:${config.port}`);
    });

    // Graceful shutdown handling
    const shutdown = (signal: string) => {
        logger.info(`Received ${signal}, shutting down gracefully...`);
        server.close(() => {
            logger.info("HTTP server closed.");
            process.exit(0);
        });
        setTimeout(() => {
            logger.error("Forced shutdown due to timeout.");
            process.exit(1);
        }, 5000).unref();
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    return server;
}

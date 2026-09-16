import express, { Express } from "express";
import cors from "cors";
import { config } from "./config";
import routes from "./routes";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler } from "./middleware/errorHandler";

export function createApp(): Express {
    const app = express();

    // CORS setup
    app.use(cors({
        origin: config.corsOrigin === "*" ? true : config.corsOrigin,
        credentials: true,
    }));

    // Body parsing
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Request logging
    app.use(requestLogger);

    // API & legacy routes
    app.use(routes);

    // Error handling
    app.use(errorHandler);

    return app;
}

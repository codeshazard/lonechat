import { startServer } from "./server";

export * from "./app";
export * from "./server";
export * from "./config";
export * from "./services/presence.service";
export * from "./services/user.service";
export * from "./services/room.service";
export * from "./services/iceServer.service";

if (require.main === module) {
    startServer();
}

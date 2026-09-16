import { io, Socket } from "socket.io-client";
import { ENV } from "../config/env";
import { getPersistentClientId } from "../utils/clientId";

/**
 * Creates a new Socket.IO client configured with persistent clientId auth.
 */
export function createChatSocket(): Socket {
    const clientId = getPersistentClientId();
    return io(ENV.BACKEND_URL, {
        auth: { clientId },
        query: { clientId },
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        transports: ["websocket", "polling"],
    });
}

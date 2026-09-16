import { logger } from "../utils/logger";

/**
 * PresenceService manages online visitor and user tracking.
 * It maps persistent client IDs (from browser storage) to their open socket connections.
 * This guarantees:
 * 1. Multiple tabs from the same client/device are counted as ONE online user.
 * 2. Tab refresh causes zero counter flicker or count inflation.
 * 3. Counter decrements cleanly when all tabs from a client disconnect.
 * 4. Stale sockets can be periodically pruned.
 */
export class PresenceService {
    // Maps unique clientId -> Set of active socket IDs
    private clientSockets: Map<string, Set<string>> = new Map();
    // Reverse map: socketId -> clientId for fast O(1) unregistration
    private socketToClient: Map<string, string> = new Map();

    /**
     * Register a new socket connection.
     * @param socketId The connected socket.id
     * @param clientId Optional persistent client ID from handshake auth/query
     * @returns The updated total count of unique online people
     */
    registerSocket(socketId: string, clientId?: string): number {
        // Fall back to socketId if no clientId is provided
        const effectiveClientId = (clientId && clientId.trim().length > 0)
            ? clientId.trim()
            : `anon:${socketId}`;

        let sockets = this.clientSockets.get(effectiveClientId);
        if (!sockets) {
            sockets = new Set<string>();
            this.clientSockets.set(effectiveClientId, sockets);
        }

        sockets.add(socketId);
        this.socketToClient.set(socketId, effectiveClientId);

        const onlineCount = this.getOnlineCount();
        logger.debug(`Socket ${socketId} registered for client ${effectiveClientId}. Active sockets for client: ${sockets.size}. Total online: ${onlineCount}`);
        return onlineCount;
    }

    /**
     * Unregister a disconnected socket.
     * @param socketId The disconnected socket.id
     * @returns The updated total count of unique online people
     */
    unregisterSocket(socketId: string): number {
        const clientId = this.socketToClient.get(socketId);
        if (!clientId) {
            return this.getOnlineCount();
        }

        this.socketToClient.delete(socketId);
        const sockets = this.clientSockets.get(clientId);

        if (sockets) {
            sockets.delete(socketId);
            if (sockets.size === 0) {
                this.clientSockets.delete(clientId);
            }
        }

        const onlineCount = this.getOnlineCount();
        logger.debug(`Socket ${socketId} unregistered for client ${clientId}. Total online: ${onlineCount}`);
        return onlineCount;
    }

    /**
     * Get the current count of unique online users.
     * Always at least 0.
     */
    getOnlineCount(): number {
        return this.clientSockets.size;
    }

    /**
     * Remove any sockets that are no longer active according to Socket.IO.
     * @param activeSocketIds Set of currently connected socket IDs
     * @returns The updated online count
     */
    pruneStale(activeSocketIds: Set<string>): number {
        for (const [socketId, clientId] of this.socketToClient.entries()) {
            if (!activeSocketIds.has(socketId)) {
                this.socketToClient.delete(socketId);
                const sockets = this.clientSockets.get(clientId);
                if (sockets) {
                    sockets.delete(socketId);
                    if (sockets.size === 0) {
                        this.clientSockets.delete(clientId);
                    }
                }
            }
        }
        return this.getOnlineCount();
    }

    /**
     * Clear all records (primarily for testing).
     */
    reset(): void {
        this.clientSockets.clear();
        this.socketToClient.clear();
    }
}

export const presenceService = new PresenceService();

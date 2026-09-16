import { Server, Socket } from "socket.io";
import { presenceService } from "../services/presence.service";
import { userService } from "../services/user.service";
import { roomService } from "../services/room.service";
import { logger } from "../utils/logger";

export function setupSocketHandlers(io: Server): void {
    io.on("connection", (socket: Socket) => {
        // Extract persistent clientId from auth or query
        const clientId = (socket.handshake.auth?.clientId || socket.handshake.query?.clientId) as string | undefined;

        // Register socket with PresenceService
        const currentCount = presenceService.registerSocket(socket.id, clientId);
        logger.info(`Socket connected: ${socket.id} (client: ${clientId || 'anonymous'}). Online: ${currentCount}`);

        // Broadcast updated count to all connected users
        io.emit("online-count", currentCount);

        // User profile and preference initialization
        socket.on("init-user", ({ name, preferences }: { name: string; preferences: any }) => {
            userService.addUser(name, socket, preferences);
        });

        // WebRTC Signaling
        socket.on("offer", ({ sdp, roomId }: { sdp: string; roomId: string }) => {
            if (roomId && sdp) {
                roomService.onOffer(roomId, sdp, socket.id);
            }
        });

        socket.on("answer", ({ sdp, roomId }: { sdp: string; roomId: string }) => {
            if (roomId && sdp) {
                roomService.onAnswer(roomId, sdp, socket.id);
            }
        });

        socket.on("add-ice-candidate", ({ candidate, roomId, type }: { candidate: any; roomId: string; type: "sender" | "receiver" }) => {
            if (roomId && candidate) {
                roomService.onIceCandidates(roomId, socket.id, candidate, type);
            }
        });

        // Skip / Next
        socket.on("next", () => {
            userService.skipUser(socket.id);
        });

        // Report & Block
        socket.on("report", () => {
            userService.reportUser(socket.id);
        });

        // Text Chat
        socket.on("chat-message", ({ message }: { message: string }) => {
            if (!message || typeof message !== "string" || !message.trim()) return;
            const roomResult = roomService.getRoomBySocketId(socket.id);
            if (!roomResult) return;
            const { room } = roomResult;
            const otherUser = room.user1.socket.id === socket.id ? room.user2 : room.user1;
            otherUser?.socket?.emit("chat-message", { message: message.trim() });
        });

        // Typing Indicators
        socket.on("typing-start", () => {
            const roomResult = roomService.getRoomBySocketId(socket.id);
            if (!roomResult) return;
            const { room } = roomResult;
            const otherUser = room.user1.socket.id === socket.id ? room.user2 : room.user1;
            otherUser?.socket?.emit("typing-start");
        });

        socket.on("typing-stop", () => {
            const roomResult = roomService.getRoomBySocketId(socket.id);
            if (!roomResult) return;
            const { room } = roomResult;
            const otherUser = room.user1.socket.id === socket.id ? room.user2 : room.user1;
            otherUser?.socket?.emit("typing-stop");
        });

        // Disconnection & Cleanup
        socket.on("disconnect", (reason: string) => {
            logger.info(`Socket disconnected: ${socket.id}. Reason: ${reason}`);
            userService.removeUser(socket.id);
            const updatedCount = presenceService.unregisterSocket(socket.id);
            io.emit("online-count", updatedCount);
        });
    });
}

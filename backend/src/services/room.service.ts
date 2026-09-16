import { Room } from "../models/room.model";
import { User } from "../models/user.model";
import { logger } from "../utils/logger";

let globalRoomSequence = 1;

export class RoomService {
    private rooms: Map<string, Room>;

    constructor() {
        this.rooms = new Map<string, Room>();
    }

    /**
     * Create a room between two matched users and initiate WebRTC signaling.
     */
    createRoom(user1: User, user2: User): string {
        const roomId = (globalRoomSequence++).toString();
        const room: Room = {
            id: roomId,
            user1,
            user2,
            createdAt: Date.now(),
        };

        this.rooms.set(roomId, room);
        logger.info(`Room created: ${roomId} between ${user1.name} (${user1.socket.id}) and ${user2.name} (${user2.socket.id})`);

        // Notify both peers to initiate WebRTC offers
        user1.socket.emit("send-offer", { roomId });
        user2.socket.emit("send-offer", { roomId });

        return roomId;
    }

    /**
     * Closes an active room and removes it from memory.
     */
    closeRoom(roomId: string): Room | null {
        const room = this.rooms.get(roomId);
        if (!room) return null;
        this.rooms.delete(roomId);
        logger.info(`Room closed: ${roomId}`);
        return room;
    }

    /**
     * Finds a room that contains the specified socket ID.
     */
    getRoomBySocketId(socketId: string): { roomId: string; room: Room } | null {
        for (const [roomId, room] of this.rooms.entries()) {
            if (room.user1.socket.id === socketId || room.user2.socket.id === socketId) {
                return { roomId, room };
            }
        }
        return null;
    }

    /**
     * Relays SDP offer to the opposing peer in the room.
     */
    onOffer(roomId: string, sdp: string, senderSocketId: string): void {
        const room = this.rooms.get(roomId);
        if (!room) return;
        const receivingUser = room.user1.socket.id === senderSocketId ? room.user2 : room.user1;
        receivingUser?.socket?.emit("offer", { sdp, roomId });
    }

    /**
     * Relays SDP answer to the opposing peer in the room.
     */
    onAnswer(roomId: string, sdp: string, senderSocketId: string): void {
        const room = this.rooms.get(roomId);
        if (!room) return;
        const receivingUser = room.user1.socket.id === senderSocketId ? room.user2 : room.user1;
        receivingUser?.socket?.emit("answer", { sdp, roomId });
    }

    /**
     * Relays ICE candidate to the opposing peer in the room.
     */
    onIceCandidates(roomId: string, senderSocketId: string, candidate: any, type: "sender" | "receiver"): void {
        const room = this.rooms.get(roomId);
        if (!room) return;
        const receivingUser = room.user1.socket.id === senderSocketId ? room.user2 : room.user1;
        receivingUser?.socket?.emit("add-ice-candidate", { candidate, type });
    }

    /**
     * Get the count of currently active rooms.
     */
    getActiveRoomCount(): number {
        return this.rooms.size;
    }

    /**
     * Reset rooms (mainly for testing).
     */
    reset(): void {
        this.rooms.clear();
    }
}

export const roomService = new RoomService();

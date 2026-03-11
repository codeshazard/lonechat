import { Socket } from "socket.io";
import { RoomManager } from "./RoomManager";

export interface User {
    socket: Socket;
    name: string;
}

export class UserManager {
    private users: User[];
    private queue: string[];
    private roomManager: RoomManager;
    private blockedPairs: Set<string>;

    constructor() {
        this.users = [];
        this.queue = [];
        this.roomManager = new RoomManager();
        this.blockedPairs = new Set();
    }

    private getPairKey(id1: string, id2: string): string {
        return [id1, id2].sort().join(":");
    }

    private isBlocked(id1: string, id2: string): boolean {
        return this.blockedPairs.has(this.getPairKey(id1, id2));
    }

    private blockPair(id1: string, id2: string) {
        this.blockedPairs.add(this.getPairKey(id1, id2));
    }

    addUser(name: string, socket: Socket) {
        this.users.push({ name, socket });
        this.queue.push(socket.id);
        socket.emit("lobby");
        this.clearQueue();
        this.initHandlers(socket);
    }

    removeUser(socketId: string) {
        const result = this.roomManager.getRoomBySocketId(socketId);
        if (result) {
            const { roomId, room } = result;
            const otherUser = room.user1.socket.id === socketId ? room.user2 : room.user1;
            this.roomManager.closeRoom(roomId);
            otherUser.socket.emit("lobby");
            this.queue.push(otherUser.socket.id);
            this.clearQueue();
        }

        this.users = this.users.filter(x => x.socket.id !== socketId);
        this.queue = this.queue.filter(x => x !== socketId);

        for (const key of this.blockedPairs) {
            if (key.includes(socketId)) this.blockedPairs.delete(key);
        }
    }

    skipUser(socketId: string) {
        const result = this.roomManager.getRoomBySocketId(socketId);
        if (!result) return;

        const { roomId, room } = result;
        const otherUser = room.user1.socket.id === socketId ? room.user2 : room.user1;
        const skippingUser = room.user1.socket.id === socketId ? room.user1 : room.user2;

        this.roomManager.closeRoom(roomId);
        skippingUser.socket.emit("lobby");
        otherUser.socket.emit("lobby");

        this.queue.push(skippingUser.socket.id);
        this.queue.push(otherUser.socket.id);
        this.clearQueue();
    }

    reportUser(reporterSocketId: string) {
        const result = this.roomManager.getRoomBySocketId(reporterSocketId);
        if (!result) return;

        const { roomId, room } = result;
        const reporter = room.user1.socket.id === reporterSocketId ? room.user1 : room.user2;
        const reported = room.user1.socket.id === reporterSocketId ? room.user2 : room.user1;

        this.blockPair(reporter.socket.id, reported.socket.id);
        console.log(`Blocked pair: ${reporter.socket.id} <-> ${reported.socket.id}`);

        this.roomManager.closeRoom(roomId);
        reporter.socket.emit("lobby");
        reported.socket.emit("lobby");

        this.queue.push(reporter.socket.id);
        this.queue.push(reported.socket.id);
        this.clearQueue();
    }

    clearQueue() {
        console.log("inside clear queue, length:", this.queue.length);
        if (this.queue.length < 2) return;

        for (let i = this.queue.length - 1; i >= 1; i--) {
            for (let j = i - 1; j >= 0; j--) {
                const id1 = this.queue[i];
                const id2 = this.queue[j];

                if (!this.isBlocked(id1, id2)) {
                    const user1 = this.users.find(x => x.socket.id === id1);
                    const user2 = this.users.find(x => x.socket.id === id2);

                    if (user1 && user2) {
                        this.queue = this.queue.filter((_, idx) => idx !== i && idx !== j);
                        console.log("creating room for", id1, id2);
                        this.roomManager.createRoom(user1, user2);
                        this.clearQueue();
                        return;
                    }
                }
            }
        }

        console.log("No non-blocked pairs available in queue");
    }

    initHandlers(socket: Socket) {
        socket.on("offer", ({ sdp, roomId }: { sdp: string, roomId: string }) => {
            this.roomManager.onOffer(roomId, sdp, socket.id);
        });

        socket.on("answer", ({ sdp, roomId }: { sdp: string, roomId: string }) => {
            this.roomManager.onAnswer(roomId, sdp, socket.id);
        });

        socket.on("add-ice-candidate", ({ candidate, roomId, type }) => {
            this.roomManager.onIceCandidates(roomId, socket.id, candidate, type);
        });

        socket.on("next", () => {
            console.log("user skipped:", socket.id);
            this.skipUser(socket.id);
        });

        socket.on("report", () => {
            console.log("user reported by:", socket.id);
            this.reportUser(socket.id);
        });

        socket.on("chat-message", ({ message }: { message: string }) => {
        console.log("chat message received from:", socket.id, "message:", message);
        const result = this.roomManager.getRoomBySocketId(socket.id);
        console.log("room found:", result ? result.roomId : "NOT FOUND");
        if (!result) return;
        const { room } = result;
        const otherUser = room.user1.socket.id === socket.id ? room.user2 : room.user1;
        console.log("sending to:", otherUser.socket.id);
        otherUser.socket.emit("chat-message", { message });
    });
    }
}
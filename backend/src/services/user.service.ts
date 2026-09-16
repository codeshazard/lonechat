import { Socket } from "socket.io";
import { User, UserPreferences } from "../models/user.model";
import { roomService, RoomService } from "./room.service";
import { logger } from "../utils/logger";

export class UserService {
    private users: Map<string, User> = new Map();
    private queue: string[] = [];
    private blockedPairs: Set<string> = new Set();
    private roomManager: RoomService;

    constructor(roomManager: RoomService = roomService) {
        this.roomManager = roomManager;
    }

    private getPairKey(id1: string, id2: string): string {
        return [id1, id2].sort().join(":");
    }

    private isBlocked(id1: string, id2: string): boolean {
        return this.blockedPairs.has(this.getPairKey(id1, id2));
    }

    private blockPair(id1: string, id2: string): void {
        this.blockedPairs.add(this.getPairKey(id1, id2));
    }

    /**
     * Sanitize user interests: lowercase, trimmed, deduplicated, non-empty.
     */
    private sanitizePreferences(prefs?: Partial<UserPreferences>): UserPreferences {
        const rawInterests = Array.isArray(prefs?.interests) ? prefs!.interests : [];
        const sanitizedInterests = Array.from(
            new Set(
                rawInterests
                    .map(i => (typeof i === 'string' ? i.trim().toLowerCase() : ''))
                    .filter(i => i.length > 0)
            )
        );

        return {
            gender: prefs?.gender === "Female" ? "Female" : "Male",
            preferredGender: prefs?.preferredGender === "Male" || prefs?.preferredGender === "Female" ? prefs.preferredGender : "Any",
            interests: sanitizedInterests,
        };
    }

    /**
     * Add or update an active user in matchmaking.
     */
    addUser(name: string, socket: Socket, preferences?: Partial<UserPreferences>): void {
        const sanitizedPrefs = this.sanitizePreferences(preferences);
        const cleanName = (name && name.trim().length > 0) ? name.trim() : "Anonymous";

        const user: User = {
            name: cleanName,
            socket,
            preferences: sanitizedPrefs,
            joinedAt: Date.now(),
        };

        this.users.set(socket.id, user);

        // Put in queue if not already there
        if (!this.queue.includes(socket.id)) {
            this.queue.push(socket.id);
        }

        socket.emit("lobby");
        logger.info(`User registered: ${cleanName} (${socket.id}). Queue length: ${this.queue.length}`);
        this.clearQueue();
    }

    /**
     * Remove a user when their socket disconnects.
     */
    removeUser(socketId: string): void {
        // If the user was in an active room, notify the other peer and re-queue them
        const roomResult = this.roomManager.getRoomBySocketId(socketId);
        if (roomResult) {
            const { roomId, room } = roomResult;
            const otherUser = room.user1.socket.id === socketId ? room.user2 : room.user1;
            this.roomManager.closeRoom(roomId);

            if (otherUser.socket.connected) {
                otherUser.socket.emit("lobby");
                if (!this.queue.includes(otherUser.socket.id)) {
                    this.queue.push(otherUser.socket.id);
                }
                this.clearQueue();
            }
        }

        this.users.delete(socketId);
        this.queue = this.queue.filter(id => id !== socketId);

        // Clean up blocked pairs involving this socket
        for (const key of this.blockedPairs) {
            if (key.includes(socketId)) {
                this.blockedPairs.delete(key);
            }
        }

        logger.info(`User removed: ${socketId}. Remaining users: ${this.users.size}, Queue: ${this.queue.length}`);
    }

    /**
     * Skip the current chat partner and return to queue for a new match.
     */
    skipUser(socketId: string): void {
        const roomResult = this.roomManager.getRoomBySocketId(socketId);
        if (!roomResult) {
            // If user clicked skip while in lobby, make sure they are in the queue
            const user = this.users.get(socketId);
            if (user && user.socket.connected && !this.queue.includes(socketId)) {
                this.queue.push(socketId);
                user.socket.emit("lobby");
                this.clearQueue();
            }
            return;
        }

        const { roomId, room } = roomResult;
        const otherUser = room.user1.socket.id === socketId ? room.user2 : room.user1;
        const skippingUser = room.user1.socket.id === socketId ? room.user1 : room.user2;

        this.roomManager.closeRoom(roomId);

        skippingUser.socket.emit("lobby");
        otherUser.socket.emit("lobby");

        if (skippingUser.socket.connected && !this.queue.includes(skippingUser.socket.id)) {
            this.queue.push(skippingUser.socket.id);
        }
        if (otherUser.socket.connected && !this.queue.includes(otherUser.socket.id)) {
            this.queue.push(otherUser.socket.id);
        }

        logger.info(`User ${socketId} skipped match with ${otherUser.socket.id}`);
        this.clearQueue();
    }

    /**
     * Report the current chat partner, block re-matching, and re-queue both.
     */
    reportUser(reporterSocketId: string): void {
        const roomResult = this.roomManager.getRoomBySocketId(reporterSocketId);
        if (!roomResult) return;

        const { roomId, room } = roomResult;
        const reporter = room.user1.socket.id === reporterSocketId ? room.user1 : room.user2;
        const reported = room.user1.socket.id === reporterSocketId ? room.user2 : room.user1;

        this.blockPair(reporter.socket.id, reported.socket.id);
        logger.warn(`Blocked pair: ${reporter.socket.id} reported ${reported.socket.id}`);

        this.roomManager.closeRoom(roomId);

        reporter.socket.emit("lobby");
        reported.socket.emit("lobby");

        if (reporter.socket.connected && !this.queue.includes(reporter.socket.id)) {
            this.queue.push(reporter.socket.id);
        }
        if (reported.socket.connected && !this.queue.includes(reported.socket.id)) {
            this.queue.push(reported.socket.id);
        }

        this.clearQueue();
    }

    /**
     * Check if two users are compatible based on gender and optionally interests.
     */
    private isMatch(user1: User, user2: User, strict: boolean): boolean {
        // Gender preference check
        const u1LikesU2 = user1.preferences.preferredGender === "Any" || user1.preferences.preferredGender === user2.preferences.gender;
        const u2LikesU1 = user2.preferences.preferredGender === "Any" || user2.preferences.preferredGender === user1.preferences.gender;

        if (!u1LikesU2 || !u2LikesU1) return false;

        if (strict) {
            const hasU1Interests = user1.preferences.interests.length > 0;
            const hasU2Interests = user2.preferences.interests.length > 0;

            if (hasU1Interests && hasU2Interests) {
                // Match if at least one interest is shared (case-insensitive)
                const hasSharedInterest = user1.preferences.interests.some(interest =>
                    user2.preferences.interests.includes(interest)
                );
                if (!hasSharedInterest) return false;
            } else if (hasU1Interests || hasU2Interests) {
                // One user specified interests while the other did not -> not a strict match
                return false;
            }
        }

        return true;
    }

    /**
     * Prune disconnected sockets from queue.
     */
    private pruneQueue(): void {
        this.queue = this.queue.filter(socketId => {
            const user = this.users.get(socketId);
            return user && user.socket.connected;
        });
    }

    /**
     * Match users in queue:
     * 1. Try strict matching (interests + gender)
     * 2. Fall back to relaxed matching (gender only)
     */
    clearQueue(): void {
        this.pruneQueue();
        if (this.queue.length < 2) return;

        // Pass 1: Strict matching (gender + interests)
        if (this.tryMatchUsers(true)) return;

        // Pass 2: Relaxed matching (gender only, fallback)
        if (this.tryMatchUsers(false)) return;
    }

    private tryMatchUsers(strict: boolean): boolean {
        for (let i = this.queue.length - 1; i >= 1; i--) {
            for (let j = i - 1; j >= 0; j--) {
                const id1 = this.queue[i];
                const id2 = this.queue[j];

                if (!this.isBlocked(id1, id2)) {
                    const user1 = this.users.get(id1);
                    const user2 = this.users.get(id2);

                    if (user1 && user2 && user1.socket.connected && user2.socket.connected && this.isMatch(user1, user2, strict)) {
                        this.queue = this.queue.filter((_, idx) => idx !== i && idx !== j);
                        logger.info(`Matched [${strict ? 'Strict' : 'Relaxed'}]: ${user1.name} (${id1}) <-> ${user2.name} (${id2})`);
                        this.roomManager.createRoom(user1, user2);
                        // Recurse to match remaining users in the queue
                        this.clearQueue();
                        return true;
                    }
                }
            }
        }
        return false;
    }

    getQueueLength(): number {
        return this.queue.length;
    }

    getUserCount(): number {
        return this.users.size;
    }

    getUser(socketId: string): User | undefined {
        return this.users.get(socketId);
    }

    reset(): void {
        this.users.clear();
        this.queue = [];
        this.blockedPairs.clear();
    }
}

export const userService = new UserService();

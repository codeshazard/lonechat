import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { UserService } from "../services/user.service";
import { RoomService } from "../services/room.service";

// Mock socket factory
function createMockSocket(id: string) {
    const emittedEvents: { event: string; payload?: any }[] = [];
    return {
        id,
        connected: true,
        emit: (event: string, payload?: any) => {
            emittedEvents.push({ event, payload });
        },
        _events: emittedEvents,
    } as any;
}

describe("UserService - Matchmaking and Blocking Logic", () => {
    let userService: UserService;
    let roomService: RoomService;

    beforeEach(() => {
        roomService = new RoomService();
        userService = new UserService(roomService);
    });

    it("should match two compatible users strictly based on shared interests", () => {
        const socket1 = createMockSocket("socket-1");
        const socket2 = createMockSocket("socket-2");

        userService.addUser("Alice", socket1, {
            gender: "Female",
            preferredGender: "Any",
            interests: ["anime", "gaming"],
        });

        assert.strictEqual(userService.getQueueLength(), 1);

        userService.addUser("Bob", socket2, {
            gender: "Male",
            preferredGender: "Female",
            interests: ["GAMING", "music"], // Case-insensitive match on "gaming"
        });

        // Room should be created, queue should be empty
        assert.strictEqual(userService.getQueueLength(), 0);
        assert.strictEqual(roomService.getActiveRoomCount(), 1);

        // Both sockets should have received send-offer
        const s1Offer = socket1._events.find((e: any) => e.event === "send-offer");
        const s2Offer = socket2._events.find((e: any) => e.event === "send-offer");
        assert.ok(s1Offer, "Socket 1 should receive send-offer");
        assert.ok(s2Offer, "Socket 2 should receive send-offer");
        assert.strictEqual(s1Offer.payload.roomId, s2Offer.payload.roomId);
    });

    it("should fall back to relaxed matching if no shared interests exist", () => {
        const socket1 = createMockSocket("socket-1");
        const socket2 = createMockSocket("socket-2");

        userService.addUser("Alice", socket1, {
            gender: "Female",
            preferredGender: "Male",
            interests: ["art"],
        });

        userService.addUser("Bob", socket2, {
            gender: "Male",
            preferredGender: "Female",
            interests: ["cars"],
        });

        // Even with no shared interests, relaxed matching will match them because genders match!
        assert.strictEqual(userService.getQueueLength(), 0);
        assert.strictEqual(roomService.getActiveRoomCount(), 1);
    });

    it("should not match users if gender preference is incompatible", () => {
        const socket1 = createMockSocket("socket-1");
        const socket2 = createMockSocket("socket-2");

        // Alice is Female looking ONLY for Females
        userService.addUser("Alice", socket1, {
            gender: "Female",
            preferredGender: "Female",
            interests: ["coding"],
        });

        // Bob is Male looking for Females
        userService.addUser("Bob", socket2, {
            gender: "Male",
            preferredGender: "Female",
            interests: ["coding"],
        });

        // Incompatible -> remain in queue
        assert.strictEqual(userService.getQueueLength(), 2);
        assert.strictEqual(roomService.getActiveRoomCount(), 0);
    });

    it("should not re-match reported/blocked pairs", () => {
        const socket1 = createMockSocket("socket-1");
        const socket2 = createMockSocket("socket-2");

        userService.addUser("Alice", socket1, { gender: "Female", preferredGender: "Any", interests: [] });
        userService.addUser("Bob", socket2, { gender: "Male", preferredGender: "Any", interests: [] });

        assert.strictEqual(roomService.getActiveRoomCount(), 1);

        // Alice reports Bob
        userService.reportUser("socket-1");

        // Room is closed, both users are back in queue
        assert.strictEqual(roomService.getActiveRoomCount(), 0);
        assert.strictEqual(userService.getQueueLength(), 2);

        // Try to clear queue again - they should NOT be matched together because they are blocked!
        userService.clearQueue();
        assert.strictEqual(roomService.getActiveRoomCount(), 0);
        assert.strictEqual(userService.getQueueLength(), 2);
    });
});

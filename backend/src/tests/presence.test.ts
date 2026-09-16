import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { PresenceService } from "../services/presence.service";

describe("PresenceService - Online User Count Tracking", () => {
    let presence: PresenceService;

    beforeEach(() => {
        presence = new PresenceService();
    });

    it("should start with 0 online users", () => {
        assert.strictEqual(presence.getOnlineCount(), 0);
    });

    it("should increment count when a single client connects", () => {
        const count = presence.registerSocket("sock-1", "client-A");
        assert.strictEqual(count, 1);
        assert.strictEqual(presence.getOnlineCount(), 1);
    });

    it("should decrement count to 0 when the client disconnects", () => {
        presence.registerSocket("sock-1", "client-A");
        const count = presence.unregisterSocket("sock-1");
        assert.strictEqual(count, 0);
        assert.strictEqual(presence.getOnlineCount(), 0);
    });

    it("should count multiple tabs from the same client as ONE online user", () => {
        // Tab 1 connects
        presence.registerSocket("sock-tab-1", "client-A");
        assert.strictEqual(presence.getOnlineCount(), 1);

        // Tab 2 connects from same user/browser
        presence.registerSocket("sock-tab-2", "client-A");
        assert.strictEqual(presence.getOnlineCount(), 1);

        // Tab 3 connects from same user/browser
        presence.registerSocket("sock-tab-3", "client-A");
        assert.strictEqual(presence.getOnlineCount(), 1);

        // Close Tab 1 -> user still has 2 tabs open -> count remains 1
        presence.unregisterSocket("sock-tab-1");
        assert.strictEqual(presence.getOnlineCount(), 1);

        // Close Tab 2 -> user still has 1 tab open -> count remains 1
        presence.unregisterSocket("sock-tab-2");
        assert.strictEqual(presence.getOnlineCount(), 1);

        // Close Tab 3 -> all tabs closed -> count drops to 0
        presence.unregisterSocket("sock-tab-3");
        assert.strictEqual(presence.getOnlineCount(), 0);
    });

    it("should handle page refresh without flickering or negative numbers", () => {
        // User opens page
        presence.registerSocket("sock-old", "client-A");
        assert.strictEqual(presence.getOnlineCount(), 1);

        // Page refreshes: new tab connects before old tab socket disconnect event arrives
        presence.registerSocket("sock-new", "client-A");
        assert.strictEqual(presence.getOnlineCount(), 1);

        // Old socket closes
        presence.unregisterSocket("sock-old");
        assert.strictEqual(presence.getOnlineCount(), 1);

        // Finally user leaves
        presence.unregisterSocket("sock-new");
        assert.strictEqual(presence.getOnlineCount(), 0);
    });

    it("should accurately track multiple distinct users", () => {
        presence.registerSocket("sock-user-1", "client-1");
        presence.registerSocket("sock-user-2", "client-2");
        presence.registerSocket("sock-user-3", "client-3");
        assert.strictEqual(presence.getOnlineCount(), 3);

        presence.unregisterSocket("sock-user-2");
        assert.strictEqual(presence.getOnlineCount(), 2);

        presence.unregisterSocket("sock-user-1");
        assert.strictEqual(presence.getOnlineCount(), 1);

        presence.unregisterSocket("sock-user-3");
        assert.strictEqual(presence.getOnlineCount(), 0);
    });

    it("should prune stale sockets not present in active list", () => {
        presence.registerSocket("sock-active", "client-1");
        presence.registerSocket("sock-stale", "client-2");
        assert.strictEqual(presence.getOnlineCount(), 2);

        const activeSockets = new Set(["sock-active"]);
        const count = presence.pruneStale(activeSockets);
        assert.strictEqual(count, 1);
        assert.strictEqual(presence.getOnlineCount(), 1);
    });
});

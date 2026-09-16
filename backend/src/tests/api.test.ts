import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import http from "http";
import { createApp } from "../app";

describe("API Endpoints Validation", () => {
    let server: http.Server;
    let baseUrl: string;

    before(async () => {
        const app = createApp();
        server = http.createServer(app);
        await new Promise<void>((resolve) => {
            server.listen(0, "127.0.0.1", () => {
                const address = server.address() as any;
                baseUrl = `http://127.0.0.1:${address.port}`;
                resolve();
            });
        });
    });

    after(async () => {
        await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    it("GET /health should return 200 with status ok and uptime", async () => {
        const res = await fetch(`${baseUrl}/health`);
        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.strictEqual(data.status, "ok");
        assert.ok(typeof data.uptime === "number");
        assert.ok(data.timestamp);
    });

    it("GET /api/health should return identical 200 payload", async () => {
        const res = await fetch(`${baseUrl}/api/health`);
        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.strictEqual(data.status, "ok");
    });

    it("GET /api/online-count should return 200 with onlineCount number", async () => {
        const res = await fetch(`${baseUrl}/api/online-count`);
        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.ok(typeof data.onlineCount === "number");
    });

    it("GET /api/stats should return 200 with stats metrics", async () => {
        const res = await fetch(`${baseUrl}/api/stats`);
        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.ok(typeof data.onlineUsers === "number");
        assert.ok(typeof data.activeRooms === "number");
        assert.ok(typeof data.queueUsers === "number");
        assert.ok(typeof data.totalUsers === "number");
    });

    it("GET /ice-servers should return 200 with iceServers array", async () => {
        const res = await fetch(`${baseUrl}/ice-servers`);
        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.ok(Array.isArray(data.iceServers));
        assert.ok(data.iceServers.length > 0);
        assert.ok(data.iceServers[0].urls);
    });

    it("GET /api/ice-servers should return 200 with iceServers array", async () => {
        const res = await fetch(`${baseUrl}/api/ice-servers`);
        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.ok(Array.isArray(data.iceServers));
    });
});

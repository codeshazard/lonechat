import { ENV } from "../config/env";

export interface IceServersResponse {
    iceServers: RTCIceServer[];
}

export const apiService = {
    /**
     * Fetch TURN/STUN credentials from backend.
     */
    async getIceServers(): Promise<RTCConfiguration> {
        try {
            const res = await fetch(`${ENV.BACKEND_URL}/ice-servers`);
            if (!res.ok) {
                return ENV.FALLBACK_ICE_CONFIG;
            }
            const data = await res.json();
            if (Array.isArray(data)) {
                return { iceServers: data };
            }
            if (data && Array.isArray(data.iceServers)) {
                return { iceServers: data.iceServers };
            }
            return ENV.FALLBACK_ICE_CONFIG;
        } catch (err) {
            console.warn("Failed to fetch ICE servers from backend, falling back to STUN:", err);
            return ENV.FALLBACK_ICE_CONFIG;
        }
    },

    /**
     * Fetch current online user count via REST.
     */
    async getOnlineCount(): Promise<number | null> {
        try {
            const res = await fetch(`${ENV.BACKEND_URL}/api/online-count`);
            if (!res.ok) return null;
            const data = await res.json();
            return typeof data.onlineCount === "number" ? data.onlineCount : null;
        } catch (_err) {
            return null;
        }
    },
};

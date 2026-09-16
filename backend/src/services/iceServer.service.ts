import { config } from "../config";
import { logger } from "../utils/logger";

interface IceServersResponse {
    iceServers: any[];
}

interface CachedCredentials {
    data: IceServersResponse;
    expiresAt: number;
}

export class IceServerService {
    private cache: CachedCredentials | null = null;

    /**
     * Fetch fresh ICE/TURN servers from Metered.ca or fall back to public STUN servers.
     */
    async getIceServers(): Promise<IceServersResponse> {
        const fallback: IceServersResponse = {
            iceServers: config.fallbackIceServers,
        };

        const { apiKey, domain, cacheTtlMs } = config.metered;

        // If Metered credentials aren't configured, immediately return STUN fallback
        if (!apiKey || !domain) {
            return fallback;
        }

        // Check if cache is still valid
        const now = Date.now();
        if (this.cache && this.cache.expiresAt > now) {
            return this.cache.data;
        }

        try {
            const url = `https://${domain}/api/v1/turn/credentials?apiKey=${apiKey}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);

            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) {
                logger.warn(`Metered API returned HTTP ${response.status} ${response.statusText}, using STUN fallback`);
                return fallback;
            }

            const data = await response.json();
            let parsedServers: any[] = [];

            if (Array.isArray(data)) {
                parsedServers = data;
            } else if (data && Array.isArray(data.iceServers)) {
                parsedServers = data.iceServers;
            }

            if (parsedServers.length > 0) {
                const result: IceServersResponse = { iceServers: parsedServers };
                this.cache = {
                    data: result,
                    expiresAt: now + cacheTtlMs,
                };
                logger.info(`Successfully fetched and cached ${parsedServers.length} ICE/TURN servers from Metered`);
                return result;
            }

            logger.warn("Metered API returned empty or unrecognized ICE server payload, using STUN fallback");
            return fallback;
        } catch (err: any) {
            logger.error("Failed to fetch TURN credentials from Metered:", err?.message || err);
            return fallback;
        }
    }

    /**
     * Clear cache (useful for testing or config updates).
     */
    clearCache(): void {
        this.cache = null;
    }
}

export const iceServerService = new IceServerService();

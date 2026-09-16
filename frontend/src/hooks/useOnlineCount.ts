import { useState, useEffect } from "react";
import { Socket } from "socket.io-client";
import { apiService } from "../services/api.service";

export function useOnlineCount(socket?: Socket | null) {
    const [onlineCount, setOnlineCount] = useState<number | null>(null);

    // Initial fetch from REST endpoint
    useEffect(() => {
        let mounted = true;
        apiService.getOnlineCount().then((count) => {
            if (mounted && count !== null) {
                setOnlineCount(count);
            }
        });
        return () => {
            mounted = false;
        };
    }, []);

    // Listen to live updates if socket is provided
    useEffect(() => {
        if (!socket) return;

        const handleCount = (count: number) => {
            if (typeof count === "number" && count >= 0) {
                setOnlineCount(count);
            }
        };

        socket.on("online-count", handleCount);

        return () => {
            socket.off("online-count", handleCount);
        };
    }, [socket]);

    return onlineCount;
}

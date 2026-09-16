const isDev = import.meta.env.DEV;

export const ENV = {
    // Dynamic backend URL: prefers env var, falls back to localhost:3000 in dev, and live Render backend in prod
    BACKEND_URL: import.meta.env.VITE_BACKEND_URL || (isDev ? "http://localhost:3000" : "https://lonechat.onrender.com"),
    SIGHTENGINE_USER: import.meta.env.VITE_SIGHTENGINE_USER || "",
    SIGHTENGINE_SECRET: import.meta.env.VITE_SIGHTENGINE_SECRET || "",
    FALLBACK_ICE_CONFIG: {
        iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
        ],
    },
};

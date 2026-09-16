import 'dotenv/config';

export const config = {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    corsOrigin: process.env.CORS_ORIGIN || '*',
    metered: {
        apiKey: process.env.METERED_API_KEY || '',
        domain: process.env.METERED_DOMAIN || '',
        cacheTtlMs: 10 * 60 * 1000, // 10 minutes cache
    },
    fallbackIceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
    ],
};

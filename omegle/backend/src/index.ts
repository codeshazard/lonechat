import 'dotenv/config';
import { Socket } from "socket.io";
import http from "http";
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { UserManager } from "./managers/UserManger";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

const METERED_API_KEY = process.env.METERED_API_KEY;
const METERED_DOMAIN = process.env.METERED_DOMAIN;

// TURN credentials endpoint — fetches fresh credentials from Metered.ca
app.get('/ice-servers', async (req, res) => {
    const fallback = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
        ]
    };

    if (!METERED_API_KEY || !METERED_DOMAIN) {
        return res.json(fallback);
    }

    try {
        const url = `https://${METERED_DOMAIN}/api/v1/turn/credentials?apiKey=${METERED_API_KEY}`;
        const response = await fetch(url);
        const iceServers = await response.json();
        return res.json({ iceServers });
    } catch (err) {
        console.error('Failed to fetch TURN credentials:', err);
        return res.json(fallback);
    }
});

const userManager = new UserManager(io);

io.on('connection', (socket: Socket) => {
    console.log('a socket connected:', socket.id);

    // Broadcast total site visitors (landing + chat rooms) to everyone
    io.emit("online-count", io.engine.clientsCount);

    socket.on("init-user", ({ name, preferences }: { name: string, preferences: any }) => {
        console.log('user initialized:', name);
        userManager.addUser(name, socket, preferences);
    });

    socket.on("disconnect", () => {
        console.log("user disconnected:", socket.id);
        userManager.removeUser(socket.id);
        io.emit("online-count", io.engine.clientsCount - 1);
    });
});

server.listen(3000, '0.0.0.0', () => {
    console.log('listening on *:3000');
});

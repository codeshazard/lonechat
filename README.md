# LoneChat 💬

> Meet someone new. Right now.

LoneChat is an anonymous real-time video and text chat platform that connects strangers randomly — no account, no history, no trace. Built with WebRTC for peer-to-peer video, Socket.IO for signaling, and React for the frontend.

🔗 **Live:** [lonechat.vercel.app](https://lonechat.vercel.app)

---

## Features

### Core
- 🎥 **P2P Video Chat** — Live webcam and audio streaming directly between users via WebRTC
- 💬 **Real-time Text Chat** — Message alongside the video feed with full chat history per session
- 💬 **Text-Only Mode** — Join without a camera for a pure text chat experience
- 🔀 **Random Matching** — Instantly matched with a random stranger on join
- ⏭️ **Next Stranger** — Skip your current match and connect to someone new
- 🚩 **Report & Block** — Report inappropriate users; blocked pairs are never re-matched in the same session

### Smart Matchmaking
- 👤 **Gender Preferences** — Choose your gender and who you want to connect with (Male / Female / Any)
- 🏷️ **Interest-Based Matching** — Enter interests (e.g. `anime, coding, gaming`) and get matched with people who share at least one
- 🔄 **Fallback Matching** — If no interest match is found, falls back to gender-only matching to avoid long waits

### Real-Time UX
- ✍️ **Typing Indicator** — "Stranger is typing..." appears in real time
- 🟢 **Online Counter** — See how many people are currently on the site
- 📋 **System Messages** — Chat timeline shows "Stranger connected." and "Stranger disconnected." contextually

### Safety
- 🛡️ **Consent / ToS Screen** — Age verification (18+) and terms of service required before entering
- 🤖 **AI Abuse Detection** — Sightengine AI scans the remote video feed every 10 seconds for nudity, weapons, and drugs — auto-disconnects on detection
- 🔒 **Session-only Blocks** — Reported users cannot be re-matched for the duration of the session

### Performance
- 📡 **TURN Server Support** — Metered.ca TURN servers ensure connectivity on restrictive networks
- 🔁 **Socket Reconnection** — Auto-reconnects and re-queues users if the connection drops briefly

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript |
| Backend | Node.js + Express + Socket.IO + TypeScript |
| Video | WebRTC (peer-to-peer, no video stored) |
| Styling | Pure CSS (inline + class-based) |
| Deployment | Vercel (frontend) + Render (backend) |
| Content Moderation | Sightengine API |
| TURN Servers | Metered.ca |

---

## Project Structure

```
lonechat/
├── backend/
│   ├── src/
│   │   ├── config/              # Environment configurations & defaults
│   │   ├── controllers/         # ICE & Stats endpoint controllers
│   │   ├── middleware/          # Request logger & central error handler
│   │   ├── models/              # User, room, and signaling types
│   │   ├── routes/              # Express API route declarations
│   │   ├── services/            # Presence, matchmaking, room, and TURN services
│   │   ├── sockets/             # Socket.IO connection & event handlers
│   │   ├── tests/               # Automated unit & integration test suites
│   │   ├── utils/               # Logger utilities
│   │   ├── app.ts               # Express app factory
│   │   ├── server.ts            # HTTP & Socket.IO server startup
│   │   └── index.ts             # Main entrypoint
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/          # Common, video, chat, controls, and modal components
│   │   ├── config/              # Dynamic environment config & fallbacks
│   │   ├── constants/           # Icebreaker starters & constants
│   │   ├── hooks/               # useOnlineCount, useMediaStream hooks
│   │   ├── pages/               # LandingPage & RoomPage
│   │   ├── services/            # API client, socket client, sound & moderation services
│   │   ├── styles/              # Design tokens, global, landing, and room CSS
│   │   ├── types/               # TypeScript interfaces & types
│   │   ├── utils/               # Persistent clientId and time utilities
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env.example
│   ├── package.json
│   └── vite.config.ts
│
├── package.json                 # Unified workspace scripts
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js v18+
- A [Sightengine](https://sightengine.com) account (free tier: 2000 checks/month, optional)
- A [Metered.ca](https://metered.ca) account for TURN servers (optional)

### 1. Clone the repository

```bash
git clone https://github.com/codeshazard/lonechat.git
cd lonechat
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create a `.env` file:

```env
METERED_API_KEY=your_metered_api_key
METERED_DOMAIN=your_metered_domain
```

Start the backend:

```bash
npm run dev
```

### 3. Frontend setup

```bash
cd frontend
npm install
```

Create a `.env` file:

```env
VITE_SIGHTENGINE_USER=your_sightengine_user
VITE_SIGHTENGINE_SECRET=your_sightengine_secret
```

Start the frontend:

```bash
npm run dev
```

### 4. Open in browser

Open two tabs (one normal, one incognito) at `http://localhost:5173` to test the full flow locally.

---

## Environment Variables

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_SIGHTENGINE_USER` | Sightengine API user ID |
| `VITE_SIGHTENGINE_SECRET` | Sightengine API secret |

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `METERED_API_KEY` | Metered.ca API key for TURN credentials |
| `METERED_DOMAIN` | Metered.ca domain (e.g. `yourapp.metered.live`) |

---

## Deployment

### Frontend → Vercel
1. Push to GitHub
2. Connect repo to Vercel
3. Set root directory to `omegle/frontend`
4. Add environment variables in Vercel dashboard

### Backend → Render
1. Connect repo to Render
2. Set root directory to `omegle/backend`
3. Build command: `npm install && npm run build`
4. Start command: `npm run start`
5. Add environment variables in Render dashboard

> ⚠️ Before pushing frontend to GitHub, change the `BACKEND_URL` in `Room.tsx` from `http://localhost:3000` back to `https://lonechat.onrender.com`

---

## How It Works

1. User opens the site → consent screen → enters name, gender, interests
2. Frontend connects to backend via Socket.IO and emits `init-user`
3. Backend adds user to matchmaking queue
4. When two compatible users are found, backend creates a room and sends `send-offer` to both
5. Frontend initiates WebRTC handshake (offer → answer → ICE candidates) via the backend as signaling server
6. Once WebRTC connection is established, video/audio flows directly peer-to-peer
7. Text chat flows through the backend (Socket.IO relay)
8. Every 10 seconds, Sightengine checks the remote video frame for inappropriate content

---

## Socket Events

| Event | Direction | Description |
|---|---|---|
| `init-user` | Client → Server | Register user with name and preferences |
| `send-offer` | Server → Client | Tells client to initiate WebRTC offer |
| `offer` | Client → Server → Client | WebRTC offer SDP |
| `answer` | Client → Server → Client | WebRTC answer SDP |
| `add-ice-candidate` | Client → Server → Client | ICE candidate exchange |
| `lobby` | Server → Client | User placed back in waiting queue |
| `next` | Client → Server | Skip current stranger |
| `report` | Client → Server | Report and block current stranger |
| `chat-message` | Client → Server → Client | Text message relay |
| `typing-start` | Client → Server → Client | User started typing |
| `typing-stop` | Client → Server → Client | User stopped typing |
| `online-count` | Server → Client | Total connected users |

---

## License

MIT

---

Built by [Shaswat](https://github.com/codeshazarat)

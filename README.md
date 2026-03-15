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
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Landing.tsx    # Landing page, consent screen, preferences
│   │   │   └── Room.tsx       # Video/text chat room, WebRTC logic
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── .env                   # VITE_SIGHTENGINE_USER, VITE_SIGHTENGINE_SECRET
│
└── backend/
    ├── src/
    │   ├── managers/
    │   │   ├── UserManger.ts  # Matchmaking, socket event handlers
    │   │   └── RoomManager.ts # Room creation and WebRTC signaling
    │   └── index.ts           # Express server, Socket.IO, ICE endpoint
    └── .env                   # METERED_API_KEY, METERED_DOMAIN
```

---

## Getting Started

### Prerequisites
- Node.js v18+
- A [Sightengine](https://sightengine.com) account (free tier: 2000 checks/month)
- A [Metered.ca](https://metered.ca) account for TURN servers

### 1. Clone the repository

```bash
git clone https://github.com/codeshazard/lonechat.git
cd lonechat/omegle
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

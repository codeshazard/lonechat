import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Socket, io } from "socket.io-client";

const URL = "https://lonechat.onrender.com"

const SIGHTENGINE_USER = import.meta.env.VITE_SIGHTENGINE_USER;
const SIGHTENGINE_SECRET = import.meta.env.VITE_SIGHTENGINE_SECRET;

const iceConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ]
};

interface ChatMessage {
    from: "you" | "stranger";
    text: string;
    time: string;
}

export const Room = ({
    name,
    localAudioTrack,
    localVideoTrack,
    preferences,
    textOnly
}: {
    name: string,
    localAudioTrack: MediaStreamTrack | null,
    localVideoTrack: MediaStreamTrack | null,
    preferences: {
        gender: "Male" | "Female";
        preferredGender: "Male" | "Female" | "Any";
        interests: string[];
    },
    textOnly: boolean,
}) => {
    const [_searchParams, _setSearchParams] = useSearchParams();
    const [lobby, setLobby] = useState(true);
    const [_socket, setSocket] = useState<null | Socket>(null);
    const [_sendingPc, setSendingPc] = useState<null | RTCPeerConnection>(null);
    const [_receivingPc, setReceivingPc] = useState<null | RTCPeerConnection>(null);
    const [_remoteVideoTrack, setRemoteVideoTrack] = useState<MediaStreamTrack | null>(null);
    const [_remoteAudioTrack, _setRemoteAudioTrack] = useState<MediaStreamTrack | null>(null);
    const [_remoteMediaStream, _setRemoteMediaStream] = useState<MediaStream | null>(null);
    const [abuseWarning, setAbuseWarning] = useState<string | null>(null);
    const [reportCooldown, setReportCooldown] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [isMuted, setIsMuted] = useState(false);
    const [isCamOff, setIsCamOff] = useState(false);

    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const sendingPcRef = useRef<RTCPeerConnection | null>(null);
    const receivingPcRef = useRef<RTCPeerConnection | null>(null);
    const pendingCandidates = useRef<{ candidate: RTCIceCandidateInit, type: string }[]>([]);
    const abuseCheckInterval = useRef<ReturnType<typeof setInterval> | null>(null);
    const socketRef = useRef<Socket | null>(null);
    const chatBottomRef = useRef<HTMLDivElement | null>(null);

    const getTime = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const toggleMute = useCallback(() => {
        if (localAudioTrack) {
            localAudioTrack.enabled = !localAudioTrack.enabled;
            setIsMuted(!localAudioTrack.enabled);
        }
    }, [localAudioTrack]);

    const toggleCamera = useCallback(() => {
        if (localVideoTrack) {
            localVideoTrack.enabled = !localVideoTrack.enabled;
            setIsCamOff(!localVideoTrack.enabled);
        }
    }, [localVideoTrack]);

    const cleanupPeerConnections = useCallback(() => {
        if (sendingPcRef.current) { sendingPcRef.current.close(); sendingPcRef.current = null; }
        if (receivingPcRef.current) { receivingPcRef.current.close(); receivingPcRef.current = null; }
        setSendingPc(null);
        setReceivingPc(null);
        setRemoteVideoTrack(null);
        pendingCandidates.current = [];
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        if (abuseCheckInterval.current) { clearInterval(abuseCheckInterval.current); abuseCheckInterval.current = null; }
        setAbuseWarning(null);
        setMessages([]);
    }, []);

    const handleNext = useCallback(() => {
        cleanupPeerConnections();
        socketRef.current?.emit("next");
    }, [cleanupPeerConnections]);

    const checkForAbuse = useCallback(async () => {
        const video = remoteVideoRef.current;
        if (!video || !video.srcObject || video.readyState < 2) return;

        const canvas = document.createElement("canvas");
        canvas.width = 320; canvas.height = 240;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(async (blob) => {
            if (!blob) return;
            try {
                const formData = new FormData();
                formData.append("media", blob, "frame.jpg");
                formData.append("models", "nudity-2.0,weapon,recreational_drug");
                formData.append("api_user", SIGHTENGINE_USER);
                formData.append("api_secret", SIGHTENGINE_SECRET);

                const res = await fetch("https://api.sightengine.com/1.0/check.json", { method: "POST", body: formData });
                const data = await res.json();

                const nudityScore = data?.nudity?.sexual_activity ?? 0;
                const weaponScore = data?.weapon ?? 0;
                const drugScore = data?.recreational_drug ?? 0;

                if (nudityScore > 0.7 || weaponScore > 0.7 || drugScore > 0.7) {
                    setAbuseWarning("Inappropriate content detected. Disconnecting...");
                    setLobby(true);
                    setTimeout(() => handleNext(), 2000);
                }
            } catch (err) {
                console.error("Sightengine check failed:", err);
            }
        }, "image/jpeg", 0.8);
    }, [handleNext]);

    const handleReport = useCallback(() => {
        if (reportCooldown) return;
        setReportCooldown(true);
        setAbuseWarning("User reported. Disconnecting...");
        setLobby(true);
        setTimeout(() => {
            cleanupPeerConnections();
            socketRef.current?.emit("report");
            setReportCooldown(false);
        }, 1500);
    }, [cleanupPeerConnections, reportCooldown]);

    const startAbuseDetection = useCallback(() => {
        if (abuseCheckInterval.current) clearInterval(abuseCheckInterval.current);
        abuseCheckInterval.current = setInterval(checkForAbuse, 30000);
    }, [checkForAbuse]);

    const sendMessage = useCallback(() => {
        const text = chatInput.trim();
        if (!text || lobby) return;
        socketRef.current?.emit("chat-message", { message: text });
        setMessages(prev => [...prev, { from: "you", text, time: getTime() }]);
        setChatInput("");
    }, [chatInput, lobby]);

    useEffect(() => {
        if (chatBottomRef.current && chatBottomRef.current.parentElement) {
            chatBottomRef.current.parentElement.scrollTo({
                top: chatBottomRef.current.parentElement.scrollHeight,
                behavior: "smooth"
            });
        }
    }, [messages]);

    useEffect(() => {
        const sock = io(URL);
        socketRef.current = sock;

        sock.on('send-offer', async ({ roomId }) => {
            setLobby(false);
            const pc = new RTCPeerConnection(iceConfig);
            sendingPcRef.current = pc;
            setSendingPc(pc);

            if (localVideoTrack) pc.addTrack(localVideoTrack);
            if (localAudioTrack) pc.addTrack(localAudioTrack);

            pc.onicecandidate = (e) => {
                if (e.candidate) sock.emit("add-ice-candidate", { candidate: e.candidate, type: "sender", roomId });
            };
            pc.onnegotiationneeded = async () => {
                const sdp = await pc.createOffer();
                await pc.setLocalDescription(sdp);
                sock.emit("offer", { sdp, roomId });
            };
        });

        sock.on("offer", async ({ roomId, sdp: remoteSdp }) => {
            setLobby(false);
            const pc = new RTCPeerConnection(iceConfig);
            receivingPcRef.current = pc;
            setReceivingPc(pc);

            pc.ontrack = (e) => {
                const { track } = e;
                if (remoteVideoRef.current) {
                    if (!remoteVideoRef.current.srcObject) remoteVideoRef.current.srcObject = new MediaStream();
                    (remoteVideoRef.current.srcObject as MediaStream).addTrack(track);
                    remoteVideoRef.current.play();
                }
                if (track.kind === "video") { setRemoteVideoTrack(track); startAbuseDetection(); }
            };

            pc.onicecandidate = (e) => {
                if (!e.candidate) return;
                sock.emit("add-ice-candidate", { candidate: e.candidate, type: "receiver", roomId });
            };

            await pc.setRemoteDescription(remoteSdp);
            for (const { candidate } of pendingCandidates.current) await pc.addIceCandidate(candidate);
            pendingCandidates.current = [];

            const sdp = await pc.createAnswer();
            await pc.setLocalDescription(sdp);
            sock.emit("answer", { roomId, sdp });
        });

        sock.on("answer", async ({ roomId: _roomId, sdp: remoteSdp }) => {
            setLobby(false);
            if (sendingPcRef.current) await sendingPcRef.current.setRemoteDescription(remoteSdp);
            startAbuseDetection();
        });

        sock.on("lobby", () => { cleanupPeerConnections(); setLobby(true); });

        sock.on("add-ice-candidate", async ({ candidate, type }) => {
            if (type === "sender") {
                if (receivingPcRef.current) await receivingPcRef.current.addIceCandidate(candidate);
                else pendingCandidates.current.push({ candidate, type });
            } else {
                if (sendingPcRef.current) await sendingPcRef.current.addIceCandidate(candidate);
            }
        });

        sock.on("chat-message", ({ message }: { message: string }) => {
            setMessages(prev => [...prev, { from: "stranger", text: message, time: getTime() }]);
        });

        setSocket(sock);
        return () => { sock.disconnect(); };
    }, [name]);

    useEffect(() => {
        if (localVideoRef.current && localVideoTrack) {
            localVideoRef.current.srcObject = new MediaStream([localVideoTrack]);
            localVideoRef.current.play();
        }
    }, [localVideoRef]);

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500&display=swap');
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                .room-root {
                    height: 100vh; background: #080810;
                    font-family: 'DM Sans', sans-serif;
                    display: flex; flex-direction: column; overflow: hidden; position: relative;
                }
                .room-bg-orb { position: absolute; border-radius: 50%; filter: blur(100px); opacity: 0.15; pointer-events: none; }
                .room-orb-1 { width: 600px; height: 600px; background: radial-gradient(circle, #ff4d6d, transparent); top: -200px; left: -200px; }
                .room-orb-2 { width: 500px; height: 500px; background: radial-gradient(circle, #7b2fff, transparent); bottom: -200px; right: -200px; }
                .room-header {
                    position: relative; z-index: 10; flex-shrink: 0;
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 16px 32px; border-bottom: 1px solid rgba(255,255,255,0.06);
                }
                .room-logo {
                    font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800;
                    background: linear-gradient(135deg, #ff4d6d, #c77dff);
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
                }
                .room-user-badge {
                    display: flex; align-items: center; gap: 8px;
                    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 20px; padding: 6px 14px; font-size: 13px; color: rgba(255,255,255,0.7);
                }
                .user-avatar {
                    width: 24px; height: 24px; border-radius: 50%;
                    background: linear-gradient(135deg, #ff4d6d, #c77dff);
                    display: flex; align-items: center; justify-content: center;
                    font-size: 11px; font-weight: 700; color: #fff; font-family: 'Syne', sans-serif;
                }
                .main-area { position: relative; z-index: 10; flex: 1; display: flex; overflow: hidden; }
                .videos-area {
                    flex: 1; display: flex; flex-direction: column;
                    align-items: center; justify-content: center;
                    padding: 20px; gap: 16px; overflow: hidden;
                }
                .videos-row { display: flex; gap: 16px; width: 100%; justify-content: center; }
                .video-card {
                    position: relative; border-radius: 20px; overflow: hidden;
                    background: #0d0d1a; border: 1px solid rgba(255,255,255,0.08);
                    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                    flex: 1; max-width: 480px; aspect-ratio: 4/3;
                }
                .video-card video { width: 100%; height: 100%; object-fit: cover; }
                .video-card.local video { transform: scaleX(-1); }
                .cam-off-overlay {
                    position: absolute; inset: 0;
                    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
                    background: #0d0d1a;
                }
                .cam-off-icon {
                    width: 48px; height: 48px; border-radius: 50%;
                    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
                    display: flex; align-items: center; justify-content: center;
                }
                .cam-off-icon svg { width: 22px; height: 22px; color: rgba(255,255,255,0.3); }
                .cam-off-text { font-size: 12px; color: rgba(255,255,255,0.25); }
                .video-card-label {
                    position: absolute; bottom: 12px; left: 12px;
                    display: flex; align-items: center; gap: 6px;
                    background: rgba(0,0,0,0.6); backdrop-filter: blur(10px);
                    border: 1px solid rgba(255,255,255,0.1); border-radius: 20px;
                    padding: 4px 10px; font-size: 11px; color: rgba(255,255,255,0.85);
                }
                .label-dot {
                    width: 6px; height: 6px; border-radius: 50%;
                    background: #22c55e; box-shadow: 0 0 6px #22c55e;
                    animation: pulse 2s ease-in-out infinite;
                }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
                .lobby-overlay {
                    position: absolute; inset: 0;
                    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px;
                    background: rgba(8,8,16,0.85); backdrop-filter: blur(8px);
                }
                .lobby-spinner {
                    width: 40px; height: 40px;
                    border: 3px solid rgba(255,255,255,0.08); border-top-color: #c77dff;
                    border-radius: 50%; animation: spin 0.9s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
                .lobby-text { font-size: 14px; color: rgba(255,255,255,0.5); }
                .lobby-subtext { font-size: 12px; color: rgba(255,255,255,0.25); }
                .connected-tag {
                    position: absolute; top: 12px; right: 12px;
                    display: flex; align-items: center; gap: 6px;
                    background: rgba(34,197,94,0.15); border: 1px solid rgba(34,197,94,0.3);
                    border-radius: 20px; padding: 4px 10px; font-size: 11px; color: #22c55e;
                }
                .controls-bar {
                    flex-shrink: 0; display: flex; align-items: center; justify-content: center;
                    padding: 14px 32px; border-top: 1px solid rgba(255,255,255,0.06); gap: 10px;
                }
                .next-btn {
                    display: flex; align-items: center; gap: 8px;
                    background: linear-gradient(135deg, #ff4d6d, #c77dff);
                    border: none; border-radius: 12px; padding: 11px 24px;
                    font-size: 14px; font-weight: 500; font-family: 'DM Sans', sans-serif;
                    color: #fff; cursor: pointer; transition: all 0.2s;
                }
                .next-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 30px rgba(255,77,109,0.35); }
                .next-btn:active { transform: translateY(0); }
                .next-btn svg { width: 15px; height: 15px; }
                .icon-btn {
                    width: 42px; height: 42px; border-radius: 12px; border: none; cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    transition: all 0.2s; flex-shrink: 0;
                    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
                    color: rgba(255,255,255,0.7);
                }
                .icon-btn:hover { background: rgba(255,255,255,0.1); transform: translateY(-1px); }
                .icon-btn:active { transform: translateY(0); }
                .icon-btn.active {
                    background: rgba(255,80,80,0.15); border-color: rgba(255,80,80,0.3); color: #ff6b6b;
                }
                .icon-btn svg { width: 18px; height: 18px; }
                .report-btn {
                    display: flex; align-items: center; gap: 8px;
                    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,80,80,0.3);
                    border-radius: 12px; padding: 11px 18px;
                    font-size: 14px; font-weight: 500; font-family: 'DM Sans', sans-serif;
                    color: #ff6b6b; cursor: pointer; transition: all 0.2s;
                }
                .report-btn:hover { background: rgba(255,80,80,0.1); border-color: rgba(255,80,80,0.6); transform: translateY(-1px); }
                .report-btn:active { transform: translateY(0); }
                .report-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
                .report-btn svg { width: 14px; height: 14px; }
                .controls-divider { width: 1px; height: 24px; background: rgba(255,255,255,0.08); margin: 0 4px; }

                /* Chat panel */
                .chat-panel {
                    width: 300px; flex-shrink: 0; display: flex; flex-direction: column;
                    border-left: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02);
                }
                .chat-header {
                    padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.06);
                    font-size: 12px; font-weight: 500; letter-spacing: 1px;
                    text-transform: uppercase; color: rgba(255,255,255,0.3);
                }
                .chat-messages {
                    flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px;
                }
                .chat-messages::-webkit-scrollbar { width: 4px; }
                .chat-messages::-webkit-scrollbar-track { background: transparent; }
                .chat-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
                .chat-empty {
                    flex: 1; display: flex; align-items: center; justify-content: center;
                    font-size: 13px; color: rgba(255,255,255,0.2); text-align: center; padding: 20px;
                }
                .chat-msg { display: flex; flex-direction: column; gap: 2px; max-width: 85%; }
                .chat-msg.you { align-self: flex-end; align-items: flex-end; }
                .chat-msg.stranger { align-self: flex-start; align-items: flex-start; }
                .chat-bubble { padding: 8px 12px; border-radius: 14px; font-size: 13px; line-height: 1.4; word-break: break-word; }
                .chat-msg.you .chat-bubble { background: linear-gradient(135deg, #ff4d6d, #c77dff); color: #fff; border-bottom-right-radius: 4px; }
                .chat-msg.stranger .chat-bubble { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.85); border: 1px solid rgba(255,255,255,0.08); border-bottom-left-radius: 4px; }
                .chat-time { font-size: 10px; color: rgba(255,255,255,0.25); padding: 0 4px; }
                .chat-input-area {
                    padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.06);
                    display: flex; gap: 8px; align-items: center;
                }
                .chat-input {
                    flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 10px; padding: 9px 12px; font-size: 13px;
                    color: #fff; font-family: 'DM Sans', sans-serif; outline: none; transition: all 0.2s;
                }
                .chat-input::placeholder { color: rgba(255,255,255,0.2); }
                .chat-input:focus { border-color: rgba(199,125,255,0.4); background: rgba(255,255,255,0.07); }
                .chat-input:disabled { opacity: 0.4; cursor: not-allowed; }
                .chat-send-btn {
                    width: 34px; height: 34px; border-radius: 10px; border: none; cursor: pointer;
                    background: linear-gradient(135deg, #ff4d6d, #c77dff);
                    display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0;
                }
                .chat-send-btn:hover { transform: scale(1.05); }
                .chat-send-btn:active { transform: scale(0.95); }
                .chat-send-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
                .chat-send-btn svg { width: 14px; height: 14px; color: #fff; }
                .abuse-banner {
                    position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
                    z-index: 100; display: flex; align-items: center; gap: 10px;
                    background: rgba(255,50,50,0.15); border: 1px solid rgba(255,50,50,0.4);
                    backdrop-filter: blur(12px); border-radius: 12px;
                    padding: 12px 20px; font-size: 13px; color: #ff8080;
                    animation: slideDown 0.3s cubic-bezier(0.16,1,0.3,1);
                }
                @keyframes slideDown { from { opacity: 0; transform: translateX(-50%) translateY(-10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
                @media (max-width: 900px) { .chat-panel { display: none; } }
            `}</style>

            <div className="room-root">
                <div className="room-bg-orb room-orb-1" />
                <div className="room-bg-orb room-orb-2" />

                {abuseWarning && (
                    <div className="abuse-banner"><span>⚠️</span> {abuseWarning}</div>
                )}

                <header className="room-header">
                    <div className="room-logo">LoneChat</div>
                    <div className="room-user-badge">
                        <div className="user-avatar">{name.charAt(0).toUpperCase()}</div>
                        {name}
                    </div>
                </header>

                <div className="main-area">
                    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
                        <div className="videos-area">
                            <div className="videos-row">
                                <div className="video-card remote">
                                    <video autoPlay ref={remoteVideoRef} />
                                    {!lobby && <div className="connected-tag"><div className="label-dot" />Connected</div>}
                                    <div className="video-card-label"><div className="label-dot" />Stranger</div>
                                    {lobby && (
                                        <div className="lobby-overlay">
                                            <div className="lobby-spinner" />
                                            <div className="lobby-text">Finding someone...</div>
                                            <div className="lobby-subtext">This may take a moment</div>
                                        </div>
                                    )}
                                </div>
                                <div className="video-card local">
                                    <video autoPlay ref={localVideoRef} muted style={{ opacity: isCamOff ? 0 : 1 }} />
                                    {isCamOff && (
                                        <div className="cam-off-overlay">
                                            <div className="cam-off-icon">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="1" y1="1" x2="23" y2="23"/>
                                                    <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34"/>
                                                </svg>
                                            </div>
                                            <div className="cam-off-text">Camera off</div>
                                        </div>
                                    )}
                                    <div className="video-card-label"><div className="label-dot" />You · {name}</div>
                                </div>
                            </div>
                        </div>

                        <div className="controls-bar">
                            {/* Mute button */}
                            <button
                                className={`icon-btn ${isMuted ? "active" : ""}`}
                                onClick={toggleMute}
                                title={isMuted ? "Unmute" : "Mute"}
                            >
                                {isMuted ? (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="1" y1="1" x2="23" y2="23"/>
                                        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
                                        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
                                        <line x1="12" y1="19" x2="12" y2="23"/>
                                        <line x1="8" y1="23" x2="16" y2="23"/>
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                                        <line x1="12" y1="19" x2="12" y2="23"/>
                                        <line x1="8" y1="23" x2="16" y2="23"/>
                                    </svg>
                                )}
                            </button>

                            {/* Camera toggle button */}
                            <button
                                className={`icon-btn ${isCamOff ? "active" : ""}`}
                                onClick={toggleCamera}
                                title={isCamOff ? "Turn camera on" : "Turn camera off"}
                            >
                                {isCamOff ? (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="1" y1="1" x2="23" y2="23"/>
                                        <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34"/>
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M23 7l-7 5 7 5V7z"/>
                                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                                    </svg>
                                )}
                            </button>

                            <div className="controls-divider" />

                            <button className="next-btn" onClick={handleNext}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" />
                                </svg>
                                Next Stranger
                            </button>

                            {!lobby && (
                                <button className="report-btn" onClick={handleReport} disabled={reportCooldown}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                                        <line x1="4" y1="22" x2="4" y2="15"/>
                                    </svg>
                                    Report
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Chat panel */}
                    <div className="chat-panel">
                        <div className="chat-header">Chat</div>
                        <div className="chat-messages">
                            {messages.length === 0 && (
                                <div className="chat-empty">
                                    {lobby ? "Connect to someone to start chatting" : "Say hi to your new stranger! 👋"}
                                </div>
                            )}
                            {messages.map((msg, i) => (
                                <div key={i} className={`chat-msg ${msg.from}`}>
                                    <div className="chat-bubble">{msg.text}</div>
                                    <div className="chat-time">{msg.time}</div>
                                </div>
                            ))}
                            <div ref={chatBottomRef} />
                        </div>
                        <div className="chat-input-area">
                            <input
                                id="chat-input"
                                className="chat-input"
                                type="text"
                                placeholder={lobby ? "Waiting for connection..." : "Type a message..."}
                                value={chatInput}
                                disabled={lobby}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                            />
                            <button className="chat-send-btn" onClick={sendMessage} disabled={lobby || !chatInput.trim()}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="22" y1="2" x2="11" y2="13"/>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Socket, io } from "socket.io-client";

const URL = "https://lonechat.onrender.com";

const iceConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ]
};

export const Room = ({
    name,
    localAudioTrack,
    localVideoTrack
}: {
    name: string,
    localAudioTrack: MediaStreamTrack | null,
    localVideoTrack: MediaStreamTrack | null,
}) => {
    const [_searchParams, _setSearchParams] = useSearchParams();
    const [lobby, setLobby] = useState(true);
    const [_socket, setSocket] = useState<null | Socket>(null);
    const [_sendingPc, setSendingPc] = useState<null | RTCPeerConnection>(null);
    const [_receivingPc, setReceivingPc] = useState<null | RTCPeerConnection>(null);
    const [_remoteVideoTrack, setRemoteVideoTrack] = useState<MediaStreamTrack | null>(null);
    const [_remoteAudioTrack, _setRemoteAudioTrack] = useState<MediaStreamTrack | null>(null);
    const [_remoteMediaStream, _setRemoteMediaStream] = useState<MediaStream | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
    const localVideoRef = useRef<HTMLVideoElement | null>(null);

    const sendingPcRef = useRef<RTCPeerConnection | null>(null);
    const receivingPcRef = useRef<RTCPeerConnection | null>(null);
    const pendingCandidates = useRef<{candidate: RTCIceCandidateInit, type: string}[]>([]);

    useEffect(() => {
        const socket = io(URL);

        socket.on('send-offer', async ({roomId}) => {
            setLobby(false);
            const pc = new RTCPeerConnection(iceConfig);
            sendingPcRef.current = pc;
            setSendingPc(pc);

            if (localVideoTrack) pc.addTrack(localVideoTrack);
            if (localAudioTrack) pc.addTrack(localAudioTrack);

            pc.onicecandidate = (e) => {
                if (e.candidate) {
                    socket.emit("add-ice-candidate", { candidate: e.candidate, type: "sender", roomId });
                }
            };

            pc.onnegotiationneeded = async () => {
                const sdp = await pc.createOffer();
                await pc.setLocalDescription(sdp);
                socket.emit("offer", { sdp, roomId });
            };
        });

        socket.on("offer", async ({roomId, sdp: remoteSdp}) => {
            setLobby(false);
            const pc = new RTCPeerConnection(iceConfig);
            receivingPcRef.current = pc;
            setReceivingPc(pc);

            pc.ontrack = (e) => {
                const { track } = e;
                if (remoteVideoRef.current) {
                    if (!remoteVideoRef.current.srcObject) {
                        remoteVideoRef.current.srcObject = new MediaStream();
                    }
                    (remoteVideoRef.current.srcObject as MediaStream).addTrack(track);
                    remoteVideoRef.current.play();
                }
                if (track.kind === "video") setRemoteVideoTrack(track);
            };

            pc.onicecandidate = (e) => {
                if (!e.candidate) return;
                socket.emit("add-ice-candidate", { candidate: e.candidate, type: "receiver", roomId });
            };

            await pc.setRemoteDescription(remoteSdp);
            for (const {candidate} of pendingCandidates.current) {
                await pc.addIceCandidate(candidate);
            }
            pendingCandidates.current = [];

            const sdp = await pc.createAnswer();
            await pc.setLocalDescription(sdp);
            socket.emit("answer", { roomId, sdp });
        });

        socket.on("answer", async ({roomId: _roomId, sdp: remoteSdp}) => {
            setLobby(false);
            if (sendingPcRef.current) {
                await sendingPcRef.current.setRemoteDescription(remoteSdp);
            }
        });

        socket.on("lobby", () => setLobby(true));

        socket.on("add-ice-candidate", async ({candidate, type}) => {
            if (type === "sender") {
                if (receivingPcRef.current) {
                    await receivingPcRef.current.addIceCandidate(candidate);
                } else {
                    pendingCandidates.current.push({candidate, type});
                }
            } else {
                if (sendingPcRef.current) {
                    await sendingPcRef.current.addIceCandidate(candidate);
                }
            }
        });

        setSocket(socket);
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
                    min-height: 100vh;
                    background: #080810;
                    font-family: 'DM Sans', sans-serif;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    position: relative;
                }

                .room-bg-orb {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(100px);
                    opacity: 0.15;
                    pointer-events: none;
                }
                .room-orb-1 {
                    width: 600px; height: 600px;
                    background: radial-gradient(circle, #ff4d6d, transparent);
                    top: -200px; left: -200px;
                }
                .room-orb-2 {
                    width: 500px; height: 500px;
                    background: radial-gradient(circle, #7b2fff, transparent);
                    bottom: -200px; right: -200px;
                }

                .room-header {
                    position: relative;
                    z-index: 10;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 20px 32px;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                }

                .room-logo {
                    font-family: 'Syne', sans-serif;
                    font-size: 22px;
                    font-weight: 800;
                    background: linear-gradient(135deg, #ff4d6d, #c77dff);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .room-user-badge {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 20px;
                    padding: 6px 14px;
                    font-size: 13px;
                    color: rgba(255,255,255,0.7);
                }

                .user-avatar {
                    width: 24px; height: 24px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #ff4d6d, #c77dff);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 11px;
                    font-weight: 700;
                    color: #fff;
                    font-family: 'Syne', sans-serif;
                }

                .videos-area {
                    position: relative;
                    z-index: 10;
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 32px;
                    gap: 24px;
                }

                .video-card {
                    position: relative;
                    border-radius: 24px;
                    overflow: hidden;
                    background: #0d0d1a;
                    border: 1px solid rgba(255,255,255,0.08);
                    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                    flex: 1;
                    max-width: 600px;
                    aspect-ratio: 4/3;
                }

                .video-card video {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .video-card.local video {
                    transform: scaleX(-1);
                }

                .video-card-label {
                    position: absolute;
                    bottom: 16px;
                    left: 16px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    background: rgba(0,0,0,0.6);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 20px;
                    padding: 5px 12px;
                    font-size: 12px;
                    color: rgba(255,255,255,0.85);
                }

                .label-dot {
                    width: 6px; height: 6px;
                    border-radius: 50%;
                    background: #22c55e;
                    box-shadow: 0 0 6px #22c55e;
                    animation: pulse 2s ease-in-out infinite;
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }

                .lobby-overlay {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 16px;
                    background: rgba(8,8,16,0.85);
                    backdrop-filter: blur(8px);
                }

                .lobby-spinner {
                    width: 44px; height: 44px;
                    border: 3px solid rgba(255,255,255,0.08);
                    border-top-color: #c77dff;
                    border-radius: 50%;
                    animation: spin 0.9s linear infinite;
                }

                @keyframes spin { to { transform: rotate(360deg); } }

                .lobby-text {
                    font-size: 14px;
                    color: rgba(255,255,255,0.5);
                    letter-spacing: 0.3px;
                }

                .lobby-subtext {
                    font-size: 12px;
                    color: rgba(255,255,255,0.25);
                }

                .connected-tag {
                    position: absolute;
                    top: 16px;
                    right: 16px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    background: rgba(34,197,94,0.15);
                    border: 1px solid rgba(34,197,94,0.3);
                    border-radius: 20px;
                    padding: 4px 10px;
                    font-size: 11px;
                    color: #22c55e;
                }

                @media (max-width: 768px) {
                    .videos-area { flex-direction: column; padding: 16px; gap: 16px; }
                    .video-card { max-width: 100%; }
                }
            `}</style>

            <div className="room-root">
                <div className="room-bg-orb room-orb-1" />
                <div className="room-bg-orb room-orb-2" />

                <header className="room-header">
                    <div className="room-logo">LoneChat</div>
                    <div className="room-user-badge">
                        <div className="user-avatar">{name.charAt(0).toUpperCase()}</div>
                        {name}
                    </div>
                </header>

                <div className="videos-area">
                    {/* Remote video */}
                    <div className="video-card remote">
                        <video autoPlay ref={remoteVideoRef} />
                        {!lobby && (
                            <div className="connected-tag">
                                <div className="label-dot" />
                                Connected
                            </div>
                        )}
                        <div className="video-card-label">
                            <div className="label-dot" />
                            Stranger
                        </div>
                        {lobby && (
                            <div className="lobby-overlay">
                                <div className="lobby-spinner" />
                                <div className="lobby-text">Finding someone...</div>
                                <div className="lobby-subtext">This may take a moment</div>
                            </div>
                        )}
                    </div>

                    {/* Local video */}
                    <div className="video-card local">
                        <video autoPlay ref={localVideoRef} muted />
                        <div className="video-card-label">
                            <div className="label-dot" />
                            You · {name}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

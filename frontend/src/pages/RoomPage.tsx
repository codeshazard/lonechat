import React, { useEffect, useRef, useState, useCallback } from "react";
import { Socket } from "socket.io-client";
import { RoomProps, ChatMessage } from "../types/chat";
import { OnlineBadge } from "../components/common/OnlineBadge";
import { VideoCard } from "../components/video/VideoCard";
import { ChatPanel } from "../components/chat/ChatPanel";
import { ChatControls } from "../components/controls/ChatControls";
import { createChatSocket } from "../services/socket.service";
import { apiService } from "../services/api.service";
import { playMatchSound } from "../services/sound.service";
import { checkVideoFrameForAbuse } from "../services/moderation.service";
import { getRandomStarter } from "../constants/icebreakers";
import { formatTime } from "../utils/time";
import { ENV } from "../config/env";
import { useOnlineCount } from "../hooks/useOnlineCount";
import "../styles/room.css";

export const RoomPage: React.FC<RoomProps> = ({
    name,
    localAudioTrack,
    localVideoTrack,
    preferences,
    textOnly,
    onLeave,
}) => {
    // Room state
    const [isLobby, setIsLobby] = useState(true);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [isStrangerTyping, setIsStrangerTyping] = useState(false);
    const [abuseWarning, setAbuseWarning] = useState<string | null>(null);
    const [reportCooldown, setReportCooldown] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isCamOff, setIsCamOff] = useState(false);

    // Mobile responsive tab ("video" | "chat")
    const [mobileTab, setMobileTab] = useState<"video" | "chat">("video");
    const [unreadMessages, setUnreadMessages] = useState(0);

    // Refs
    const socketRef = useRef<Socket | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const sendingPcRef = useRef<RTCPeerConnection | null>(null);
    const receivingPcRef = useRef<RTCPeerConnection | null>(null);
    const pendingCandidates = useRef<{ candidate: RTCIceCandidateInit; type: string }[]>([]);
    const iceConfigRef = useRef<RTCConfiguration>(ENV.FALLBACK_ICE_CONFIG);
    const isLobbyRef = useRef(true);
    const isTypingRef = useRef(false);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abuseCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Online presence tracking hook
    const [currentSocket, setCurrentSocket] = useState<Socket | null>(null);
    const onlineCount = useOnlineCount(currentSocket);

    const setIsLobbySync = (val: boolean) => {
        isLobbyRef.current = val;
        setIsLobby(val);
    };

    // Close peer connections cleanly
    const cleanupPeerConnections = useCallback(() => {
        if (sendingPcRef.current) {
            sendingPcRef.current.close();
            sendingPcRef.current = null;
        }
        if (receivingPcRef.current) {
            receivingPcRef.current.close();
            receivingPcRef.current = null;
        }
        pendingCandidates.current = [];

        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
        }

        if (abuseCheckIntervalRef.current) {
            clearInterval(abuseCheckIntervalRef.current);
            abuseCheckIntervalRef.current = null;
        }

        setAbuseWarning(null);
        setIsStrangerTyping(false);
        isTypingRef.current = false;
    }, []);

    // Skip to next stranger
    const handleNext = useCallback(() => {
        cleanupPeerConnections();
        setMessages([]);
        socketRef.current?.emit("next");
    }, [cleanupPeerConnections]);

    // Report and block stranger
    const handleReport = useCallback(() => {
        if (reportCooldown) return;
        setReportCooldown(true);
        setAbuseWarning("User reported and blocked. Finding a new partner...");
        setIsLobbySync(true);

        setTimeout(() => {
            cleanupPeerConnections();
            setMessages([]);
            socketRef.current?.emit("report");
            setReportCooldown(false);
        }, 1500);
    }, [cleanupPeerConnections, reportCooldown]);

    // Abuse detection loop
    const runAbuseCheck = useCallback(async () => {
        if (textOnly || !remoteVideoRef.current) return;
        const result = await checkVideoFrameForAbuse(remoteVideoRef.current);
        if (result.flagged) {
            setAbuseWarning(result.reason || "Inappropriate content detected. Disconnecting...");
            setIsLobbySync(true);
            setTimeout(() => handleNext(), 2000);
        }
    }, [textOnly, handleNext]);

    const startAbuseMonitoring = useCallback(() => {
        if (textOnly) return;
        if (abuseCheckIntervalRef.current) {
            clearInterval(abuseCheckIntervalRef.current);
        }
        setTimeout(() => runAbuseCheck(), 3000);
        abuseCheckIntervalRef.current = setInterval(runAbuseCheck, 10000);
    }, [textOnly, runAbuseCheck]);

    // Audio / Video toggles
    const handleToggleMute = useCallback(() => {
        if (localAudioTrack) {
            localAudioTrack.enabled = !localAudioTrack.enabled;
            setIsMuted(!localAudioTrack.enabled);
        }
    }, [localAudioTrack]);

    const handleToggleCamera = useCallback(() => {
        if (localVideoTrack) {
            localVideoTrack.enabled = !localVideoTrack.enabled;
            setIsCamOff(!localVideoTrack.enabled);
        }
    }, [localVideoTrack]);

    // Text messaging
    const handleSendMessage = useCallback(() => {
        const text = chatInput.trim();
        if (!text || isLobbyRef.current) return;

        socketRef.current?.emit("chat-message", { message: text });
        setMessages((prev) => [
            ...prev,
            {
                id: "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
                from: "you",
                text,
                time: formatTime(),
            },
        ]);
        setChatInput("");

        if (isTypingRef.current) {
            socketRef.current?.emit("typing-stop");
            isTypingRef.current = false;
        }
    }, [chatInput]);

    const handleTypingChange = useCallback((val: string) => {
        setChatInput(val);
        if (isLobbyRef.current) return;

        if (val.trim() && !isTypingRef.current) {
            socketRef.current?.emit("typing-start");
            isTypingRef.current = true;
        }

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            if (isTypingRef.current) {
                socketRef.current?.emit("typing-stop");
                isTypingRef.current = false;
            }
        }, 2000);

        if (!val.trim() && isTypingRef.current) {
            socketRef.current?.emit("typing-stop");
            isTypingRef.current = false;
        }
    }, []);

    // Ensure viewport is always at top on entry
    useEffect(() => {
        window.scrollTo(0, 0);
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
    }, []);

    // Bind ESC key to skip
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                handleNext();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleNext]);

    // Bind local preview video stream
    useEffect(() => {
        if (localVideoRef.current && localVideoTrack && !textOnly) {
            localVideoRef.current.srcObject = new MediaStream([localVideoTrack]);
            localVideoRef.current.play().catch(() => {});
        }
    }, [localVideoTrack, textOnly]);

    // Socket and WebRTC connection lifecycle
    useEffect(() => {
        let isMounted = true;

        // Fetch fresh ICE/TURN configuration
        apiService.getIceServers().then((config) => {
            if (isMounted) {
                iceConfigRef.current = config;
            }
        });

        // Initialize single socket connection
        const sock = createChatSocket();
        socketRef.current = sock;
        setCurrentSocket(sock);

        sock.on("connect", () => {
            sock.emit("init-user", {
                name,
                preferences,
            });
        });

        sock.on("reconnect", () => {
            cleanupPeerConnections();
            setMessages([]);
            setIsLobbySync(true);
        });

        const onMatchSuccess = () => {
            setIsLobbySync(false);
            playMatchSound();
            setMessages([
                {
                    id: "sys_conn_" + Date.now(),
                    from: "system",
                    text: "Stranger connected.",
                    time: formatTime(),
                },
                {
                    id: "sys_ice_" + Date.now(),
                    from: "system",
                    text: getRandomStarter(),
                    time: formatTime(),
                    isIcebreaker: true,
                },
            ]);
        };

        // WebRTC: Sender offer
        sock.on("send-offer", async ({ roomId }: { roomId: string }) => {
            onMatchSuccess();
            if (textOnly) return;

            const pc = new RTCPeerConnection(iceConfigRef.current);
            sendingPcRef.current = pc;

            if (localVideoTrack) pc.addTrack(localVideoTrack);
            if (localAudioTrack) pc.addTrack(localAudioTrack);

            pc.onicecandidate = (e) => {
                if (e.candidate) {
                    sock.emit("add-ice-candidate", {
                        candidate: e.candidate,
                        type: "sender",
                        roomId,
                    });
                }
            };

            pc.onnegotiationneeded = async () => {
                try {
                    const sdp = await pc.createOffer();
                    await pc.setLocalDescription(sdp);
                    sock.emit("offer", { sdp, roomId });
                } catch (err) {
                    console.warn("Offer creation error:", err);
                }
            };
        });

        // WebRTC: Receiver receives offer
        sock.on("offer", async ({ roomId, sdp: remoteSdp }: { roomId: string; sdp: RTCSessionDescriptionInit }) => {
            onMatchSuccess();
            if (textOnly) return;

            const pc = new RTCPeerConnection(iceConfigRef.current);
            receivingPcRef.current = pc;

            pc.ontrack = (e) => {
                const { track } = e;
                if (remoteVideoRef.current) {
                    if (!remoteVideoRef.current.srcObject) {
                        remoteVideoRef.current.srcObject = new MediaStream();
                    }
                    (remoteVideoRef.current.srcObject as MediaStream).addTrack(track);
                    remoteVideoRef.current.play().catch(() => {});
                }
                if (track.kind === "video") {
                    startAbuseMonitoring();
                }
            };

            pc.onicecandidate = (e) => {
                if (e.candidate) {
                    sock.emit("add-ice-candidate", {
                        candidate: e.candidate,
                        type: "receiver",
                        roomId,
                    });
                }
            };

            try {
                await pc.setRemoteDescription(new RTCSessionDescription(remoteSdp));
                for (const { candidate } of pendingCandidates.current) {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                }
                pendingCandidates.current = [];

                const sdp = await pc.createAnswer();
                await pc.setLocalDescription(sdp);
                sock.emit("answer", { roomId, sdp });
            } catch (err) {
                console.warn("Answer error:", err);
            }
        });

        // WebRTC: Answer received
        sock.on("answer", async ({ sdp: remoteSdp }: { sdp: RTCSessionDescriptionInit }) => {
            setIsLobbySync(false);
            if (sendingPcRef.current) {
                try {
                    await sendingPcRef.current.setRemoteDescription(new RTCSessionDescription(remoteSdp));
                    startAbuseMonitoring();
                } catch (err) {
                    console.warn("Remote description error:", err);
                }
            }
        });

        // ICE candidate relay
        sock.on("add-ice-candidate", async ({ candidate, type }: { candidate: RTCIceCandidateInit; type: string }) => {
            try {
                if (type === "sender") {
                    if (receivingPcRef.current && receivingPcRef.current.remoteDescription) {
                        await receivingPcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                    } else {
                        pendingCandidates.current.push({ candidate, type });
                    }
                } else {
                    if (sendingPcRef.current && sendingPcRef.current.remoteDescription) {
                        await sendingPcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                    }
                }
            } catch (err) {
                console.warn("Add ICE candidate error:", err);
            }
        });

        // Match disconnected -> returned to lobby
        sock.on("lobby", () => {
            if (!isLobbyRef.current) {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: "sys_disc_" + Date.now(),
                        from: "system",
                        text: "Stranger disconnected.",
                        time: formatTime(),
                    },
                ]);
            }
            cleanupPeerConnections();
            setIsLobbySync(true);
        });

        // Incoming chat messages
        sock.on("chat-message", ({ message }: { message: string }) => {
            setMessages((prev) => [
                ...prev,
                {
                    id: "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
                    from: "stranger",
                    text: message,
                    time: formatTime(),
                },
            ]);
            setIsStrangerTyping(false);

            // If on mobile and viewing video tab, show unread indicator
            setMobileTab((currTab) => {
                if (currTab === "video") {
                    setUnreadMessages((count) => count + 1);
                }
                return currTab;
            });
        });

        sock.on("typing-start", () => setIsStrangerTyping(true));
        sock.on("typing-stop", () => setIsStrangerTyping(false));

        return () => {
            isMounted = false;
            cleanupPeerConnections();
            sock.disconnect();
            socketRef.current = null;
            setCurrentSocket(null);
        };
    }, [name, preferences, textOnly, cleanupPeerConnections, startAbuseMonitoring]);

    // Clear unread badge when switching to chat tab
    const handleSwitchMobileTab = (tab: "video" | "chat") => {
        setMobileTab(tab);
        if (tab === "chat") {
            setUnreadMessages(0);
        }
    };

    return (
        <div className={`room-root mobile-mode-${mobileTab}`}>
            <div className="room-bg-orb room-orb-1" />
            <div className="room-bg-orb room-orb-2" />

            {/* Inappropriate content banner */}
            {abuseWarning && (
                <div className="abuse-warning-banner" role="alert">
                    <span>⚠️</span>
                    <span>{abuseWarning}</span>
                </div>
            )}

            {/* Room Header */}
            <header className="room-header">
                <div className="room-logo">LoneChat</div>

                {/* Mobile View Switcher */}
                <div className="mobile-view-tabs">
                    <button
                        className={`mobile-tab-btn ${mobileTab === "video" ? "active" : ""}`}
                        onClick={() => handleSwitchMobileTab("video")}
                    >
                        {textOnly ? "💬 Chat Info" : "🎥 Video"}
                    </button>
                    <button
                        className={`mobile-tab-btn ${mobileTab === "chat" ? "active" : ""}`}
                        onClick={() => handleSwitchMobileTab("chat")}
                    >
                        <span>💬 Chat</span>
                        {unreadMessages > 0 && <span className="mobile-unread-dot" />}
                    </button>
                </div>

                <div className="room-header-right">
                    {/* Real-time online counter */}
                    <OnlineBadge count={onlineCount} />

                    <div className="user-badge">
                        <div className="user-avatar-circle">
                            {name.charAt(0).toUpperCase()}
                        </div>
                        <span>{name}</span>
                    </div>

                    {onLeave && (
                        <button className="leave-btn" onClick={onLeave} title="Leave room">
                            Leave
                        </button>
                    )}
                </div>
            </header>

            {/* Main Area */}
            <div className="room-main-area">
                {/* Video Panel */}
                <div className="room-video-panel">
                    {textOnly ? (
                        <div className="text-only-container">
                            <div className="text-only-card">
                                {isLobby ? (
                                    <>
                                        <div className="lobby-spinner" />
                                        <h2 className="text-only-title">Finding someone to chat with...</h2>
                                        <p className="text-only-subtitle">Text Only Mode · Searching matchmaking queue</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-only-icon">💬</div>
                                        <h2 className="text-only-title">Connected with a Stranger</h2>
                                        <p className="text-only-subtitle">Text Only Mode · Say hello in the chat panel!</p>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="video-grid-area">
                            <div className="video-grid-row">
                                {/* Stranger / Remote Video */}
                                <VideoCard
                                    videoRef={remoteVideoRef}
                                    label="Stranger"
                                    isLocal={false}
                                    isConnected={!isLobby}
                                    isSearching={isLobby}
                                    searchingText="Finding someone to chat with..."
                                    searchingSubtext="Matching based on your preferences"
                                />

                                {/* Local Video */}
                                <VideoCard
                                    videoRef={localVideoRef}
                                    label={`You · ${name}`}
                                    isLocal={true}
                                    isCamOff={isCamOff}
                                />
                            </div>
                        </div>
                    )}

                    {/* Bottom Controls */}
                    <ChatControls
                        textOnly={textOnly}
                        isMuted={isMuted}
                        isCamOff={isCamOff}
                        isLobby={isLobby}
                        reportCooldown={reportCooldown}
                        onToggleMute={handleToggleMute}
                        onToggleCamera={handleToggleCamera}
                        onNext={handleNext}
                        onReport={handleReport}
                    />
                </div>

                {/* Right Chat Panel */}
                <ChatPanel
                    messages={messages}
                    chatInput={chatInput}
                    onInputChange={handleTypingChange}
                    onSendMessage={handleSendMessage}
                    isStrangerTyping={isStrangerTyping}
                    isLobby={isLobby}
                />
            </div>
        </div>
    );
};

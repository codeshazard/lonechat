import React, { useState, useEffect, useRef } from "react";
import { Gender, PreferredGender } from "../types/chat";
import { OnlineBadge } from "../components/common/OnlineBadge";
import { ConsentModal } from "../components/modals/ConsentModal";
import { useOnlineCount } from "../hooks/useOnlineCount";
import { useMediaStream } from "../hooks/useMediaStream";
import { RoomPage } from "./RoomPage";
import "../styles/landing.css";

const CONSENT_STORAGE_KEY = "lc_consent_accepted";

export const LandingPage: React.FC = () => {
    const [name, setName] = useState("");
    const [gender, setGender] = useState<Gender>("Male");
    const [preferredGender, setPreferredGender] = useState<PreferredGender>("Any");
    const [interestsInput, setInterestsInput] = useState("");
    const [textOnly, setTextOnly] = useState(false);
    const [joined, setJoined] = useState(false);
    const [hasConsented, setHasConsented] = useState<boolean>(() => {
        try {
            return localStorage.getItem(CONSENT_STORAGE_KEY) === "true";
        } catch {
            return false;
        }
    });

    const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
    const onlineCount = useOnlineCount();

    const {
        localAudioTrack,
        localVideoTrack,
        camReady,
        initMedia,
    } = useMediaStream(!textOnly && hasConsented);

    // Initialize or restore camera preview if consented and not in text-only mode
    useEffect(() => {
        if (!joined && hasConsented && !textOnly) {
            if (localVideoTrack && localVideoTrack.readyState === "live") {
                localVideoTrack.enabled = true;
                if (localAudioTrack) localAudioTrack.enabled = true;
                if (videoPreviewRef.current) {
                    videoPreviewRef.current.srcObject = new MediaStream([localVideoTrack]);
                    videoPreviewRef.current.play().catch(() => {});
                }
            } else {
                initMedia().then((stream) => {
                    if (stream && videoPreviewRef.current) {
                        videoPreviewRef.current.srcObject = stream;
                        videoPreviewRef.current.play().catch(() => {});
                    }
                });
            }
        }
    }, [joined, hasConsented, textOnly, localVideoTrack, localAudioTrack, initMedia]);

    const handleAcceptConsent = () => {
        try {
            localStorage.setItem(CONSENT_STORAGE_KEY, "true");
        } catch {
            // Ignore storage access issues
        }
        setHasConsented(true);
    };

    const handleDeclineConsent = () => {
        window.location.href = "https://google.com";
    };

    const handleStartChat = () => {
        if (!name.trim()) return;
        window.scrollTo(0, 0);
        setJoined(true);
    };

    const handleLeaveRoom = () => {
        if (localVideoTrack) localVideoTrack.enabled = true;
        if (localAudioTrack) localAudioTrack.enabled = true;
        setJoined(false);
    };

    // Show Consent Screen first if not accepted yet
    if (!hasConsented) {
        return (
            <ConsentModal
                onAccept={handleAcceptConsent}
                onDecline={handleDeclineConsent}
            />
        );
    }

    // When joined, render RoomPage
    if (joined) {
        const parsedInterests = interestsInput
            .split(",")
            .map(i => i.trim())
            .filter(i => i.length > 0);

        return (
            <RoomPage
                name={name.trim()}
                localAudioTrack={localAudioTrack}
                localVideoTrack={localVideoTrack}
                preferences={{
                    gender,
                    preferredGender,
                    interests: parsedInterests,
                }}
                textOnly={textOnly}
                onLeave={handleLeaveRoom}
            />
        );
    }

    // Landing Page
    return (
        <main className="landing-root">
            <div className="bg-orb bg-orb-1" />
            <div className="bg-orb bg-orb-2" />
            <div className="bg-orb bg-orb-3" />

            <div className="landing-card">
                {/* Left Panel: Camera Preview or Text-Only placeholder */}
                <div className="landing-preview">
                    {textOnly ? (
                        <div className="text-only-placeholder">
                            <div className="text-only-avatar">💬</div>
                            <div className="text-only-label">
                                <strong>Text Only Mode</strong>
                                <br />No camera or microphone required
                            </div>
                        </div>
                    ) : (
                        <>
                            <video
                                ref={videoPreviewRef}
                                autoPlay
                                playsInline
                                muted
                                className="preview-video"
                            />
                            <div className="preview-overlay" />
                            {camReady && (
                                <div className="cam-badge">
                                    <div className="cam-dot" />
                                    <span>Camera on</span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Right Panel: Configuration & Start */}
                <div className="landing-form-panel">
                    <header className="brand-header">
                        <h1 className="brand-title">LoneChat</h1>
                        <p className="brand-tagline">Meet someone new. Right now.</p>
                    </header>

                    {/* Live Online Counter */}
                    <OnlineBadge count={onlineCount} />

                    {/* Mode Selector */}
                    <div className="mode-toggle">
                        <button
                            type="button"
                            className={`mode-btn ${!textOnly ? "active" : ""}`}
                            onClick={() => setTextOnly(false)}
                        >
                            🎥 Video + Chat
                        </button>
                        <button
                            type="button"
                            className={`mode-btn ${textOnly ? "active" : ""}`}
                            onClick={() => setTextOnly(true)}
                        >
                            💬 Text Only
                        </button>
                    </div>

                    {/* Name Input */}
                    <div className="input-group">
                        <label className="input-label" htmlFor="user-name-input">Your Name</label>
                        <input
                            id="user-name-input"
                            className="text-input"
                            type="text"
                            placeholder="Enter your name..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleStartChat()}
                            maxLength={30}
                        />
                    </div>

                    {/* Preferences */}
                    <div className="prefs-row">
                        <div className="input-group" style={{ flex: 1 }}>
                            <span className="input-label">I am</span>
                            <div className="segmented-group">
                                <button
                                    type="button"
                                    className={`segmented-option ${gender === "Male" ? "active" : ""}`}
                                    onClick={() => setGender("Male")}
                                >
                                    Male
                                </button>
                                <button
                                    type="button"
                                    className={`segmented-option ${gender === "Female" ? "active" : ""}`}
                                    onClick={() => setGender("Female")}
                                >
                                    Female
                                </button>
                            </div>
                        </div>

                        <div className="input-group" style={{ flex: 1 }}>
                            <span className="input-label">Looking for</span>
                            <div className="segmented-group">
                                <button
                                    type="button"
                                    className={`segmented-option ${preferredGender === "Male" ? "active" : ""}`}
                                    onClick={() => setPreferredGender("Male")}
                                >
                                    Male
                                </button>
                                <button
                                    type="button"
                                    className={`segmented-option ${preferredGender === "Female" ? "active" : ""}`}
                                    onClick={() => setPreferredGender("Female")}
                                >
                                    Female
                                </button>
                                <button
                                    type="button"
                                    className={`segmented-option ${preferredGender === "Any" ? "active" : ""}`}
                                    onClick={() => setPreferredGender("Any")}
                                >
                                    Any
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Interests */}
                    <div className="input-group">
                        <label className="input-label" htmlFor="interests-input">Interests (Optional)</label>
                        <input
                            id="interests-input"
                            className="text-input"
                            type="text"
                            placeholder="e.g. gaming, anime, music, coding"
                            value={interestsInput}
                            onChange={(e) => setInterestsInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleStartChat()}
                        />
                        <span className="input-hint">Separate with commas to match with like-minded strangers</span>
                    </div>

                    {/* Start Action */}
                    <button
                        type="button"
                        className="start-chat-btn"
                        disabled={!name.trim()}
                        onClick={handleStartChat}
                    >
                        <span>Start Chatting</span>
                        <span>→</span>
                    </button>

                    {/* Trust badges */}
                    <footer className="trust-row">
                        <div className="trust-item">
                            <span className="trust-title">P2P</span>
                            <span className="trust-subtitle">Direct Stream</span>
                        </div>
                        <div className="trust-divider" />
                        <div className="trust-item">
                            <span className="trust-title">E2E</span>
                            <span className="trust-subtitle">Encrypted</span>
                        </div>
                        <div className="trust-divider" />
                        <div className="trust-item">
                            <span className="trust-title">18+</span>
                            <span className="trust-subtitle">Verified Consent</span>
                        </div>
                    </footer>
                </div>
            </div>
        </main>
    );
};

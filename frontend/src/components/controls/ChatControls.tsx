import React from "react";

interface ChatControlsProps {
    textOnly: boolean;
    isMuted: boolean;
    isCamOff: boolean;
    isLobby: boolean;
    reportCooldown: boolean;
    onToggleMute: () => void;
    onToggleCamera: () => void;
    onNext: () => void;
    onReport: () => void;
}

export const ChatControls: React.FC<ChatControlsProps> = ({
    textOnly,
    isMuted,
    isCamOff,
    isLobby,
    reportCooldown,
    onToggleMute,
    onToggleCamera,
    onNext,
    onReport,
}) => {
    return (
        <div className="controls-bar">
            {!textOnly && (
                <>
                    <button
                        className={`control-icon-btn ${isMuted ? "active-off" : ""}`}
                        onClick={onToggleMute}
                        title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
                    >
                        {isMuted ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="1" y1="1" x2="23" y2="23" />
                                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                                <line x1="12" y1="19" x2="12" y2="23" />
                                <line x1="8" y1="23" x2="16" y2="23" />
                            </svg>
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                <line x1="12" y1="19" x2="12" y2="23" />
                                <line x1="8" y1="23" x2="16" y2="23" />
                            </svg>
                        )}
                    </button>

                    <button
                        className={`control-icon-btn ${isCamOff ? "active-off" : ""}`}
                        onClick={onToggleCamera}
                        title={isCamOff ? "Turn Camera On" : "Turn Camera Off"}
                    >
                        {isCamOff ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="1" y1="1" x2="23" y2="23" />
                                <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34" />
                            </svg>
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M23 7l-7 5 7 5V7z" />
                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                            </svg>
                        )}
                    </button>

                    <div className="controls-divider" />
                </>
            )}

            <button className="next-stranger-btn" onClick={onNext} title="Skip current match (or press ESC)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="13 17 18 12 13 7" />
                    <polyline points="6 17 11 12 6 7" />
                </svg>
                <span>Next Stranger</span>
            </button>

            {!isLobby && (
                <button
                    className="report-user-btn"
                    onClick={onReport}
                    disabled={reportCooldown}
                    title="Report and block this user"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                        <line x1="4" y1="22" x2="4" y2="15" />
                    </svg>
                    <span>Report</span>
                </button>
            )}

            <div className="esc-hint">
                <kbd className="esc-key">ESC</kbd>
                <span>to skip</span>
            </div>
        </div>
    );
};

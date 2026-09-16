import React from "react";

interface VideoCardProps {
    videoRef: React.Ref<HTMLVideoElement>;
    label: string;
    isLocal?: boolean;
    isCamOff?: boolean;
    isConnected?: boolean;
    isSearching?: boolean;
    searchingText?: string;
    searchingSubtext?: string;
}

export const VideoCard: React.FC<VideoCardProps> = ({
    videoRef,
    label,
    isLocal = false,
    isCamOff = false,
    isConnected = false,
    isSearching = false,
    searchingText = "Finding someone...",
    searchingSubtext = "This may take a moment",
}) => {
    return (
        <div className={`video-card-container ${isLocal ? "local" : "remote"}`}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isLocal}
                className={`video-element ${isLocal ? "mirrored" : ""}`}
                style={{ opacity: isCamOff ? 0 : 1 }}
            />

            {/* Label */}
            <div className="video-label">
                <div className="online-dot" />
                <span>{label}</span>
            </div>

            {/* Connected Tag */}
            {isConnected && !isSearching && (
                <div className="connected-badge">
                    <div className="online-dot" />
                    <span>Connected</span>
                </div>
            )}

            {/* Camera off placeholder */}
            {isCamOff && (
                <div className="cam-off-overlay">
                    <div className="cam-off-icon-circle">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="1" y1="1" x2="23" y2="23" />
                            <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34" />
                        </svg>
                    </div>
                    <span className="cam-off-text">Camera off</span>
                </div>
            )}

            {/* Searching lobby overlay */}
            {isSearching && (
                <div className="lobby-overlay">
                    <div className="lobby-spinner" />
                    <div className="lobby-title">{searchingText}</div>
                    <div className="lobby-subtitle">{searchingSubtext}</div>
                </div>
            )}
        </div>
    );
};

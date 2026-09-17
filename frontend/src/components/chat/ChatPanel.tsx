import React from "react";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { ChatMessage } from "../../types/chat";

interface ChatPanelProps {
    messages: ChatMessage[];
    chatInput: string;
    onInputChange: (val: string) => void;
    onSendMessage: () => void;
    isStrangerTyping: boolean;
    isLobby: boolean;
    onNext?: () => void;
    onReport?: () => void;
    reportCooldown?: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
    messages,
    chatInput,
    onInputChange,
    onSendMessage,
    isStrangerTyping,
    isLobby,
    onNext,
    onReport,
    reportCooldown,
}) => {
    return (
        <aside className="room-chat-panel" aria-label="Conversation panel">
            <div className="chat-header-bar">
                <div className="chat-header-title-wrap">
                    <span className="chat-title-text">Chat</span>
                    {!isLobby ? (
                        <span className="chat-status-badge live">● Live</span>
                    ) : (
                        <span className="chat-status-badge waiting">Matching...</span>
                    )}
                </div>

                {/* Mobile Quick Action Buttons */}
                {(onNext || onReport) && (
                    <div className="chat-header-actions">
                        {!isLobby && onReport && (
                            <button
                                type="button"
                                className="chat-header-btn report-btn"
                                onClick={onReport}
                                disabled={reportCooldown}
                                title="Report user"
                                aria-label="Report user"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                                    <line x1="4" y1="22" x2="4" y2="15" />
                                </svg>
                                <span>Report</span>
                            </button>
                        )}
                        {onNext && (
                            <button
                                type="button"
                                className="chat-header-btn next-btn"
                                onClick={onNext}
                                title="Next stranger"
                                aria-label="Next stranger"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="13 17 18 12 13 7" />
                                    <polyline points="6 17 11 12 6 7" />
                                </svg>
                                <span>Next</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            <ChatMessages
                messages={messages}
                isStrangerTyping={isStrangerTyping}
                isLobby={isLobby}
            />

            <ChatInput
                value={chatInput}
                onChange={onInputChange}
                onSend={onSendMessage}
                disabled={isLobby}
            />
        </aside>
    );
};

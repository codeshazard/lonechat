import React, { useEffect, useRef } from "react";
import { ChatMessage } from "../../types/chat";

interface ChatMessagesProps {
    messages: ChatMessage[];
    isStrangerTyping: boolean;
    isLobby: boolean;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({
    messages,
    isStrangerTyping,
    isLobby,
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const isFirstRender = useRef(true);

    useEffect(() => {
        // Prevent scrolling on initial mount when messages are empty
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        if (containerRef.current) {
            containerRef.current.scrollTo({
                top: containerRef.current.scrollHeight,
                behavior: "smooth",
            });
        }
    }, [messages, isStrangerTyping]);

    return (
        <div className="chat-message-list" ref={containerRef}>
            {messages.length === 0 && (
                <div className="chat-empty-state">
                    {isLobby ? "Searching for a stranger..." : "Say hi to your new stranger! 👋"}
                </div>
            )}

            {messages.map((msg) => {
                if (msg.from === "system") {
                    const isIcebreaker = msg.text.startsWith("🎯");
                    return (
                        <div
                            key={msg.id}
                            className={`chat-row system ${isIcebreaker ? "icebreaker" : ""}`}
                        >
                            <div className="chat-bubble">{msg.text}</div>
                        </div>
                    );
                }

                return (
                    <div key={msg.id} className={`chat-row ${msg.from}`}>
                        <div className="chat-bubble">{msg.text}</div>
                        <div className="chat-timestamp">{msg.time}</div>
                    </div>
                );
            })}

            {isStrangerTyping && (
                <div className="typing-row">
                    <div className="typing-dots">
                        <div className="typing-dot" />
                        <div className="typing-dot" />
                        <div className="typing-dot" />
                    </div>
                    <span className="typing-label">Stranger is typing...</span>
                </div>
            )}
        </div>
    );
};

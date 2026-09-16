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
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
    messages,
    chatInput,
    onInputChange,
    onSendMessage,
    isStrangerTyping,
    isLobby,
}) => {
    return (
        <aside className="room-chat-panel" aria-label="Conversation panel">
            <div className="chat-header-bar">
                <span>Chat</span>
                {!isLobby && <span style={{ color: "var(--accent-green)", fontSize: "11px" }}>● Live</span>}
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

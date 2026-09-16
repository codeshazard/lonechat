import React from "react";

interface ChatInputProps {
    value: string;
    onChange: (val: string) => void;
    onSend: () => void;
    disabled: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
    value,
    onChange,
    onSend,
    disabled,
}) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    return (
        <div className="chat-input-bar">
            <input
                className="chat-text-input"
                type="text"
                placeholder={disabled ? "Waiting for connection..." : "Type a message..."}
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
            />
            <button
                className="chat-send-icon-btn"
                onClick={onSend}
                disabled={disabled || !value.trim()}
                title="Send message"
            >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
            </button>
        </div>
    );
};

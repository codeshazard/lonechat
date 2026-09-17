import React from "react";

interface OnlineBadgeProps {
    count: number | null;
    className?: string;
}

export const OnlineBadge: React.FC<OnlineBadgeProps> = ({ count, className = "" }) => {
    if (count === null) {
        return (
            <div className={`online-badge ${className}`} title="Checking online users...">
                <div className="online-dot" />
                <span className="badge-text-full">Checking online users...</span>
                <span className="badge-text-short">Checking...</span>
            </div>
        );
    }

    const label = count === 1 ? "person online" : "people online";

    return (
        <div className={`online-badge ${className}`} title={`${count} ${label}`}>
            <div className="online-dot" />
            <span className="badge-text-full">{count} {label}</span>
            <span className="badge-text-short">{count} online</span>
        </div>
    );
};

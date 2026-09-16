import React from "react";

interface OnlineBadgeProps {
    count: number | null;
    className?: string;
}

export const OnlineBadge: React.FC<OnlineBadgeProps> = ({ count, className = "" }) => {
    if (count === null) {
        return (
            <div className={`online-badge ${className}`}>
                <div className="online-dot" />
                <span>Checking online users...</span>
            </div>
        );
    }

    const label = count === 1 ? "person online" : "people online";

    return (
        <div className={`online-badge ${className}`}>
            <div className="online-dot" />
            <span>{count} {label}</span>
        </div>
    );
};

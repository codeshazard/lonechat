import React from "react";

interface ConsentModalProps {
    onAccept: () => void;
    onDecline: () => void;
}

export const ConsentModal: React.FC<ConsentModalProps> = ({ onAccept, onDecline }) => {
    return (
        <div className="consent-overlay" role="region" aria-label="Age verification backdrop">
            <div className="consent-card" role="dialog" aria-modal="true" aria-labelledby="consent-modal-title">
                <div className="consent-badge">⚠️ Age Verification Required</div>
                <h2 className="consent-title" id="consent-modal-title">Before you continue...</h2>
                <p className="consent-body">
                    LoneChat connects you with <strong>real strangers</strong> via live peer-to-peer video and text chat.
                    By continuing, you confirm you are <strong>18 years of age or older</strong> and agree to our Terms of Service.
                </p>

                <div className="consent-rules">
                    <div className="consent-rule">
                        <div className="rule-dot" />
                        <span>Do not share explicit, violent, or illegal content.</span>
                    </div>
                    <div className="consent-rule">
                        <div className="rule-dot" />
                        <span>Do not harass, threaten, or abuse other users.</span>
                    </div>
                    <div className="consent-rule">
                        <div className="rule-dot" />
                        <span>Violations result in immediate bans.</span>
                    </div>
                    <div className="consent-rule">
                        <div className="rule-dot" />
                        <span>Video is peer-to-peer and never stored or recorded.</span>
                    </div>
                </div>

                <div className="consent-actions">
                    <button className="consent-accept-btn" onClick={onAccept}>
                        I Accept — I'm 18+
                    </button>
                    <button className="consent-decline-btn" onClick={onDecline}>
                        Leave
                    </button>
                </div>
            </div>
        </div>
    );
};

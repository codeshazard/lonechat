import { useEffect, useRef, useState } from "react"
import { io } from "socket.io-client";
import { Room } from "./Room";

const BACKEND_URL = "https://lonechat.onrender.com";

export const Landing = () => {
    const [name, setName] = useState("");
    const [gender, setGender] = useState<"Male" | "Female">("Male");
    const [preferredGender, setPreferredGender] = useState<"Male" | "Female" | "Any">("Any");
    const [interestsStr, setInterestsStr] = useState("");
    const [textOnly, setTextOnly] = useState(false);
    const [onlineCount, setOnlineCount] = useState<number | null>(null);

    const [localAudioTrack, setLocalAudioTrack] = useState<MediaStreamTrack | null>(null);
    const [localVideoTrack, setlocalVideoTrack] = useState<MediaStreamTrack | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [joined, setJoined] = useState(false);
    const [camReady, setCamReady] = useState(false);
    const [consented, setConsented] = useState(() => localStorage.getItem("lc_consent") === "yes");

    // Connect to backend just to get online count (no init-user yet)
    useEffect(() => {
        if (joined) return;
        const sock = io(BACKEND_URL, { reconnection: true });
        sock.on("online-count", (count: number) => setOnlineCount(count));
        return () => { sock.disconnect(); };
    }, [joined]);

    const getCam = async () => {
        try {
            const stream = await window.navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            const audioTrack = stream.getAudioTracks()[0];
            const videoTrack = stream.getVideoTracks()[0];
            setLocalAudioTrack(audioTrack);
            setlocalVideoTrack(videoTrack);
            if (!videoRef.current) return;
            videoRef.current.srcObject = new MediaStream([videoTrack]);
            videoRef.current.play();
            setCamReady(true);
        } catch (e) {
            console.warn("Camera access denied:", e);
        }
    };

    useEffect(() => {
        if (consented && !textOnly && videoRef && videoRef.current) {
            getCam();
        }
    }, [consented, textOnly]);

    const handleAccept = () => {
        localStorage.setItem("lc_consent", "yes");
        setConsented(true);
    };

    const handleLeave = () => {
        window.location.href = "about:blank";
    };

    // --- Consent Screen ---
    if (!consented) {
        return (
            <>
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500&display=swap');
                    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                    .consent-root {
                        min-height: 100vh; background: #080810; display: flex;
                        align-items: center; justify-content: center; font-family: 'DM Sans', sans-serif;
                        position: relative; overflow: hidden;
                    }
                    .consent-orb { position: absolute; border-radius: 50%; filter: blur(90px); opacity: 0.2; pointer-events: none; }
                    .consent-orb-1 { width: 500px; height: 500px; background: radial-gradient(circle, #ff4d6d, transparent); top: -150px; left: -100px; }
                    .consent-orb-2 { width: 400px; height: 400px; background: radial-gradient(circle, #7b2fff, transparent); bottom: -80px; right: -80px; }
                    .consent-card {
                        position: relative; z-index: 10; max-width: 500px; width: 90%;
                        background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 24px; padding: 48px 40px; backdrop-filter: blur(20px);
                        box-shadow: 0 0 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06);
                        animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both;
                        display: flex; flex-direction: column; gap: 28px;
                    }
                    @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
                    .consent-logo { font-family: 'Syne', sans-serif; font-size: 32px; font-weight: 800; background: linear-gradient(135deg, #ff4d6d, #c77dff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
                    .consent-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(255,165,0,0.1); border: 1px solid rgba(255,165,0,0.3); border-radius: 8px; padding: 8px 14px; font-size: 13px; color: #ffa500; font-weight: 500; }
                    .consent-title { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 700; color: #fff; }
                    .consent-text { font-size: 14px; color: rgba(255,255,255,0.55); line-height: 1.7; }
                    .consent-text strong { color: rgba(255,255,255,0.85); }
                    .consent-rules { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 16px 20px; display: flex; flex-direction: column; gap: 10px; }
                    .consent-rule { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; color: rgba(255,255,255,0.6); }
                    .consent-rule-dot { min-width: 6px; height: 6px; background: #c77dff; border-radius: 50%; margin-top: 6px; }
                    .consent-btns { display: flex; gap: 12px; }
                    .consent-accept { flex: 1; background: linear-gradient(135deg, #ff4d6d, #c77dff); border: none; border-radius: 12px; padding: 14px; font-size: 15px; font-weight: 500; font-family: 'DM Sans', sans-serif; color: #fff; cursor: pointer; transition: all 0.2s; }
                    .consent-accept:hover { transform: translateY(-1px); box-shadow: 0 8px 30px rgba(255,77,109,0.35); }
                    .consent-leave { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 14px 20px; font-size: 14px; color: rgba(255,255,255,0.5); font-family: 'DM Sans', sans-serif; cursor: pointer; transition: all 0.2s; }
                    .consent-leave:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.7); }
                `}</style>
                <div className="consent-root">
                    <div className="consent-orb consent-orb-1" />
                    <div className="consent-orb consent-orb-2" />
                    <div className="consent-card">
                        <div className="consent-logo">LoneChat</div>
                        <div className="consent-badge">⚠️ Age Verification Required</div>
                        <div className="consent-title">Before you continue...</div>
                        <p className="consent-text">
                            LoneChat connects you with <strong>real strangers</strong> via live video and text.
                            By continuing, you confirm you are <strong>18 years of age or older</strong> and agree to our Terms of Service.
                        </p>
                        <div className="consent-rules">
                            <div className="consent-rule"><div className="consent-rule-dot" /><span>Do not share explicit, violent, or illegal content</span></div>
                            <div className="consent-rule"><div className="consent-rule-dot" /><span>Do not harass, threaten, or abuse other users</span></div>
                            <div className="consent-rule"><div className="consent-rule-dot" /><span>Violations may result in permanent bans</span></div>
                            <div className="consent-rule"><div className="consent-rule-dot" /><span>Video is streamed peer-to-peer and not recorded by us</span></div>
                        </div>
                        <div className="consent-btns">
                            <button className="consent-accept" onClick={handleAccept}>I Accept — I'm 18+</button>
                            <button className="consent-leave" onClick={handleLeave}>Leave</button>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // --- Landing Page ---
    if (!joined) {
        return (
            <>
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500&display=swap');
                    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                    .landing-root { min-height: 100vh; background: #080810; font-family: 'DM Sans', sans-serif; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; }
                    .bg-orb { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.25; pointer-events: none; }
                    .bg-orb-1 { width: 500px; height: 500px; background: radial-gradient(circle, #ff4d6d, transparent); top: -100px; left: -100px; animation: drift1 8s ease-in-out infinite alternate; }
                    .bg-orb-2 { width: 400px; height: 400px; background: radial-gradient(circle, #7b2fff, transparent); bottom: -80px; right: -80px; animation: drift2 10s ease-in-out infinite alternate; }
                    .bg-orb-3 { width: 300px; height: 300px; background: radial-gradient(circle, #00c2ff, transparent); top: 50%; left: 60%; animation: drift3 12s ease-in-out infinite alternate; }
                    @keyframes drift1 { from { transform: translate(0,0); } to { transform: translate(60px, 80px); } }
                    @keyframes drift2 { from { transform: translate(0,0); } to { transform: translate(-60px, -40px); } }
                    @keyframes drift3 { from { transform: translate(0,0); } to { transform: translate(-80px, 60px); } }
                    .card { position: relative; z-index: 10; display: flex; gap: 48px; align-items: center; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 28px; padding: 48px; backdrop-filter: blur(20px); box-shadow: 0 0 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06); animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) both; }
                    @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
                    .video-wrapper { position: relative; border-radius: 20px; overflow: hidden; width: 300px; height: 225px; background: #0d0d1a; border: 1px solid rgba(255,255,255,0.07); flex-shrink: 0; }
                    .video-wrapper video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
                    .video-overlay { position: absolute; bottom: 0; left: 0; right: 0; height: 60px; background: linear-gradient(transparent, rgba(0,0,0,0.6)); }
                    .cam-badge { position: absolute; top: 12px; left: 12px; display: flex; align-items: center; gap: 6px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 4px 10px; font-size: 11px; color: rgba(255,255,255,0.7); font-family: 'DM Sans', sans-serif; }
                    .cam-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 6px #22c55e; animation: pulse 2s ease-in-out infinite; }
                    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
                    .text-only-placeholder { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }
                    .text-only-avatar { width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg, #ff4d6d, #c77dff); display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 700; color: #fff; font-family: 'Syne', sans-serif; }
                    .text-only-label { font-size: 12px; color: rgba(255,255,255,0.4); text-align: center; }
                    .right-panel { display: flex; flex-direction: column; gap: 20px; min-width: 280px; }
                    .brand { display: flex; flex-direction: column; gap: 6px; }
                    .brand-name { font-family: 'Syne', sans-serif; font-size: 42px; font-weight: 800; letter-spacing: -1px; background: linear-gradient(135deg, #ff4d6d, #c77dff, #48cae4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; line-height: 1; }
                    .brand-tagline { font-size: 13px; color: rgba(255,255,255,0.4); letter-spacing: 0.5px; font-weight: 300; }
                    .online-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.25); border-radius: 20px; padding: 5px 12px; font-size: 12px; color: #22c55e; width: fit-content; }
                    .online-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 6px #22c55e; animation: pulse 2s ease-in-out infinite; }
                    .mode-toggle { display: flex; gap: 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 4px; }
                    .mode-btn { flex: 1; padding: 9px 12px; border-radius: 9px; font-size: 13px; font-family: 'DM Sans', sans-serif; cursor: pointer; transition: all 0.2s; text-align: center; color: rgba(255,255,255,0.45); border: none; background: transparent; }
                    .mode-btn.active { background: rgba(255,255,255,0.08); color: #fff; font-weight: 500; }
                    .input-group { display: flex; flex-direction: column; gap: 10px; }
                    .input-label { font-size: 11px; font-weight: 500; letter-spacing: 1.5px; text-transform: uppercase; color: rgba(255,255,255,0.35); }
                    .name-input { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 14px 18px; font-size: 15px; color: #fff; font-family: 'DM Sans', sans-serif; outline: none; transition: all 0.2s; width: 100%; }
                    .name-input::placeholder { color: rgba(255,255,255,0.2); }
                    .name-input:focus { border-color: rgba(199,125,255,0.5); background: rgba(255,255,255,0.07); box-shadow: 0 0 0 3px rgba(199,125,255,0.1); }
                    .prefs-row { display: flex; gap: 16px; }
                    .radio-group { display: flex; gap: 8px; margin-top: 6px; }
                    .radio-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 8px 12px; font-size: 13px; color: rgba(255,255,255,0.6); cursor: pointer; transition: all 0.2s; }
                    .radio-btn.active { background: rgba(199,125,255,0.15); border-color: rgba(199,125,255,0.5); color: #fff; }
                    .interests-hint { font-size: 10px; color: rgba(255,255,255,0.3); margin-top: 4px; }
                    .join-btn { position: relative; overflow: hidden; background: linear-gradient(135deg, #ff4d6d, #c77dff); border: none; border-radius: 12px; padding: 15px 24px; font-size: 15px; font-weight: 500; font-family: 'DM Sans', sans-serif; color: #fff; cursor: pointer; transition: all 0.2s; letter-spacing: 0.3px; width: 100%; }
                    .join-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 30px rgba(255,77,109,0.35); }
                    .join-btn:active { transform: translateY(0); }
                    .join-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }
                    .join-btn::after { content: ''; position: absolute; inset: 0; background: linear-gradient(rgba(255,255,255,0.15), transparent); pointer-events: none; }
                    .stats-row { display: flex; gap: 16px; }
                    .stat { display: flex; flex-direction: column; gap: 2px; }
                    .stat-num { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 700; color: #fff; }
                    .stat-label { font-size: 11px; color: rgba(255,255,255,0.3); }
                    .divider { width: 1px; background: rgba(255,255,255,0.08); align-self: stretch; }
                    @media (max-width: 680px) { .card { flex-direction: column; padding: 32px 24px; gap: 32px; } .video-wrapper { width: 100%; height: 200px; } }
                `}</style>

                <div className="landing-root">
                    <div className="bg-orb bg-orb-1" />
                    <div className="bg-orb bg-orb-2" />
                    <div className="bg-orb bg-orb-3" />

                    <div className="card">
                        <div className="video-wrapper">
                            {textOnly ? (
                                <div className="text-only-placeholder">
                                    <div className="text-only-avatar">💬</div>
                                    <div className="text-only-label">Text Only Mode<br />No camera required</div>
                                </div>
                            ) : (
                                <>
                                    <video autoPlay ref={videoRef} muted />
                                    <div className="video-overlay" />
                                    {camReady && (
                                        <div className="cam-badge">
                                            <div className="cam-dot" />
                                            Camera on
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="right-panel">
                            <div className="brand">
                                <div className="brand-name">LoneChat</div>
                                <div className="brand-tagline">Meet someone new. Right now.</div>
                            </div>

                            {/* Online counter */}
                            {onlineCount !== null && (
                                <div className="online-badge">
                                    <div className="online-dot" />
                                    {onlineCount} {onlineCount === 1 ? "person" : "people"} online
                                </div>
                            )}

                            <div className="mode-toggle">
                                <button className={`mode-btn ${!textOnly ? "active" : ""}`} onClick={() => setTextOnly(false)}>
                                    🎥 Video + Chat
                                </button>
                                <button className={`mode-btn ${textOnly ? "active" : ""}`} onClick={() => setTextOnly(true)}>
                                    💬 Text Only
                                </button>
                            </div>

                            <div className="input-group">
                                <div className="input-label">Your name</div>
                                <input
                                    className="name-input"
                                    type="text"
                                    placeholder="Enter your name..."
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && name.trim() && setJoined(true)}
                                />
                            </div>

                            <div className="prefs-row">
                                <div className="input-group" style={{flex: 1}}>
                                    <div className="input-label">I am</div>
                                    <div className="radio-group">
                                        <div className={`radio-btn ${gender === "Male" ? "active" : ""}`} onClick={() => setGender("Male")}>Male</div>
                                        <div className={`radio-btn ${gender === "Female" ? "active" : ""}`} onClick={() => setGender("Female")}>Female</div>
                                    </div>
                                </div>
                                <div className="input-group" style={{flex: 1}}>
                                    <div className="input-label">Looking for</div>
                                    <div className="radio-group">
                                        <div className={`radio-btn ${preferredGender === "Male" ? "active" : ""}`} onClick={() => setPreferredGender("Male")}>Male</div>
                                        <div className={`radio-btn ${preferredGender === "Female" ? "active" : ""}`} onClick={() => setPreferredGender("Female")}>Female</div>
                                        <div className={`radio-btn ${preferredGender === "Any" ? "active" : ""}`} onClick={() => setPreferredGender("Any")}>Any</div>
                                    </div>
                                </div>
                            </div>

                            <div className="input-group">
                                <div className="input-label">Interests (Optional)</div>
                                <input
                                    className="name-input"
                                    type="text"
                                    placeholder="anime, coding, gaming..."
                                    value={interestsStr}
                                    onChange={(e) => setInterestsStr(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && name.trim() && setJoined(true)}
                                />
                                <div className="interests-hint">Separate with commas to match with similar people</div>
                            </div>

                            <button
                                className="join-btn"
                                disabled={!name.trim()}
                                onClick={() => setJoined(true)}
                            >
                                Start Chatting →
                            </button>

                            <div className="stats-row">
                                <div className="stat">
                                    <div className="stat-num">P2P</div>
                                    <div className="stat-label">Direct connection</div>
                                </div>
                                <div className="divider" />
                                <div className="stat">
                                    <div className="stat-num">E2E</div>
                                    <div className="stat-label">Encrypted video</div>
                                </div>
                                <div className="divider" />
                                <div className="stat">
                                    <div className="stat-num">18+</div>
                                    <div className="stat-label">Verified consent</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    const interests = interestsStr.split(",").map(i => i.trim()).filter(i => i.length > 0);

    return (
        <Room
            name={name}
            localAudioTrack={localAudioTrack}
            localVideoTrack={localVideoTrack}
            preferences={{ gender, preferredGender, interests }}
            textOnly={textOnly}
        />
    );
};
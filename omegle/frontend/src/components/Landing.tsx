import { useEffect, useRef, useState } from "react"
import { Room } from "./Room";

export const Landing = () => {
    const [name, setName] = useState("");
    const [localAudioTrack, setLocalAudioTrack] = useState<MediaStreamTrack | null>(null);
    const [localVideoTrack, setlocalVideoTrack] = useState<MediaStreamTrack | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [joined, setJoined] = useState(false);
    const [camReady, setCamReady] = useState(false);

    const getCam = async () => {
        const stream = await window.navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        const audioTrack = stream.getAudioTracks()[0];
        const videoTrack = stream.getVideoTracks()[0];
        setLocalAudioTrack(audioTrack);
        setlocalVideoTrack(videoTrack);
        if (!videoRef.current) return;
        videoRef.current.srcObject = new MediaStream([videoTrack]);
        videoRef.current.play();
        setCamReady(true);
    };

    useEffect(() => {
        if (videoRef && videoRef.current) {
            getCam();
        }
    }, [videoRef]);

    if (!joined) {
        return (
            <>
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500&display=swap');

                    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

                    .landing-root {
                        min-height: 100vh;
                        background: #080810;
                        font-family: 'DM Sans', sans-serif;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        overflow: hidden;
                        position: relative;
                    }

                    .bg-orb {
                        position: absolute;
                        border-radius: 50%;
                        filter: blur(80px);
                        opacity: 0.25;
                        pointer-events: none;
                    }
                    .bg-orb-1 {
                        width: 500px; height: 500px;
                        background: radial-gradient(circle, #ff4d6d, transparent);
                        top: -100px; left: -100px;
                        animation: drift1 8s ease-in-out infinite alternate;
                    }
                    .bg-orb-2 {
                        width: 400px; height: 400px;
                        background: radial-gradient(circle, #7b2fff, transparent);
                        bottom: -80px; right: -80px;
                        animation: drift2 10s ease-in-out infinite alternate;
                    }
                    .bg-orb-3 {
                        width: 300px; height: 300px;
                        background: radial-gradient(circle, #00c2ff, transparent);
                        top: 50%; left: 60%;
                        animation: drift3 12s ease-in-out infinite alternate;
                    }

                    @keyframes drift1 { from { transform: translate(0,0); } to { transform: translate(60px, 80px); } }
                    @keyframes drift2 { from { transform: translate(0,0); } to { transform: translate(-60px, -40px); } }
                    @keyframes drift3 { from { transform: translate(0,0); } to { transform: translate(-80px, 60px); } }

                    .card {
                        position: relative;
                        z-index: 10;
                        display: flex;
                        gap: 48px;
                        align-items: center;
                        background: rgba(255,255,255,0.03);
                        border: 1px solid rgba(255,255,255,0.08);
                        border-radius: 28px;
                        padding: 48px;
                        backdrop-filter: blur(20px);
                        box-shadow: 0 0 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06);
                        animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) both;
                    }

                    @keyframes fadeUp {
                        from { opacity: 0; transform: translateY(30px); }
                        to { opacity: 1; transform: translateY(0); }
                    }

                    .video-wrapper {
                        position: relative;
                        border-radius: 20px;
                        overflow: hidden;
                        width: 300px;
                        height: 225px;
                        background: #0d0d1a;
                        border: 1px solid rgba(255,255,255,0.07);
                        flex-shrink: 0;
                    }

                    .video-wrapper video {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                        transform: scaleX(-1);
                    }

                    .video-overlay {
                        position: absolute;
                        bottom: 0; left: 0; right: 0;
                        height: 60px;
                        background: linear-gradient(transparent, rgba(0,0,0,0.6));
                    }

                    .cam-badge {
                        position: absolute;
                        top: 12px; left: 12px;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        background: rgba(0,0,0,0.5);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 20px;
                        padding: 4px 10px;
                        font-size: 11px;
                        color: rgba(255,255,255,0.7);
                        font-family: 'DM Sans', sans-serif;
                    }

                    .cam-dot {
                        width: 6px; height: 6px;
                        border-radius: 50%;
                        background: #22c55e;
                        box-shadow: 0 0 6px #22c55e;
                        animation: pulse 2s ease-in-out infinite;
                    }

                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.4; }
                    }

                    .right-panel {
                        display: flex;
                        flex-direction: column;
                        gap: 28px;
                        min-width: 280px;
                    }

                    .brand {
                        display: flex;
                        flex-direction: column;
                        gap: 6px;
                    }

                    .brand-name {
                        font-family: 'Syne', sans-serif;
                        font-size: 42px;
                        font-weight: 800;
                        letter-spacing: -1px;
                        background: linear-gradient(135deg, #ff4d6d, #c77dff, #48cae4);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                        line-height: 1;
                    }

                    .brand-tagline {
                        font-size: 13px;
                        color: rgba(255,255,255,0.4);
                        letter-spacing: 0.5px;
                        font-weight: 300;
                    }

                    .input-group {
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                    }

                    .input-label {
                        font-size: 11px;
                        font-weight: 500;
                        letter-spacing: 1.5px;
                        text-transform: uppercase;
                        color: rgba(255,255,255,0.35);
                    }

                    .name-input {
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 12px;
                        padding: 14px 18px;
                        font-size: 15px;
                        color: #fff;
                        font-family: 'DM Sans', sans-serif;
                        outline: none;
                        transition: all 0.2s;
                        width: 100%;
                    }

                    .name-input::placeholder { color: rgba(255,255,255,0.2); }

                    .name-input:focus {
                        border-color: rgba(199, 125, 255, 0.5);
                        background: rgba(255,255,255,0.07);
                        box-shadow: 0 0 0 3px rgba(199,125,255,0.1);
                    }

                    .join-btn {
                        position: relative;
                        overflow: hidden;
                        background: linear-gradient(135deg, #ff4d6d, #c77dff);
                        border: none;
                        border-radius: 12px;
                        padding: 15px 24px;
                        font-size: 15px;
                        font-weight: 500;
                        font-family: 'DM Sans', sans-serif;
                        color: #fff;
                        cursor: pointer;
                        transition: all 0.2s;
                        letter-spacing: 0.3px;
                        width: 100%;
                    }

                    .join-btn:hover {
                        transform: translateY(-1px);
                        box-shadow: 0 8px 30px rgba(255,77,109,0.35);
                    }

                    .join-btn:active { transform: translateY(0); }

                    .join-btn:disabled {
                        opacity: 0.4;
                        cursor: not-allowed;
                        transform: none;
                        box-shadow: none;
                    }

                    .join-btn::after {
                        content: '';
                        position: absolute;
                        inset: 0;
                        background: linear-gradient(rgba(255,255,255,0.15), transparent);
                        pointer-events: none;
                    }

                    .stats-row {
                        display: flex;
                        gap: 16px;
                    }

                    .stat {
                        display: flex;
                        flex-direction: column;
                        gap: 2px;
                    }

                    .stat-num {
                        font-family: 'Syne', sans-serif;
                        font-size: 20px;
                        font-weight: 700;
                        color: #fff;
                    }

                    .stat-label {
                        font-size: 11px;
                        color: rgba(255,255,255,0.3);
                    }

                    .divider {
                        width: 1px;
                        background: rgba(255,255,255,0.08);
                        align-self: stretch;
                    }

                    @media (max-width: 680px) {
                        .card { flex-direction: column; padding: 32px 24px; gap: 32px; }
                        .video-wrapper { width: 100%; height: 200px; }
                    }
                `}</style>

                <div className="landing-root">
                    <div className="bg-orb bg-orb-1" />
                    <div className="bg-orb bg-orb-2" />
                    <div className="bg-orb bg-orb-3" />

                    <div className="card">
                        <div className="video-wrapper">
                            <video autoPlay ref={videoRef} muted />
                            <div className="video-overlay" />
                            {camReady && (
                                <div className="cam-badge">
                                    <div className="cam-dot" />
                                    Camera on
                                </div>
                            )}
                        </div>

                        <div className="right-panel">
                            <div className="brand">
                                <div className="brand-name">LoneChat</div>
                                <div className="brand-tagline">Meet someone new. Right now.</div>
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
                                    <div className="stat-num">0ms</div>
                                    <div className="stat-label">No account needed</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return <Room name={name} localAudioTrack={localAudioTrack} localVideoTrack={localVideoTrack} />;
};

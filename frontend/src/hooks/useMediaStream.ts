import { useState, useCallback, useRef } from "react";

export function useMediaStream(enabled: boolean) {
    const [localAudioTrack, setLocalAudioTrack] = useState<MediaStreamTrack | null>(null);
    const [localVideoTrack, setLocalVideoTrack] = useState<MediaStreamTrack | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isCamOff, setIsCamOff] = useState(false);
    const [camReady, setCamReady] = useState(false);
    const [permissionError, setPermissionError] = useState<string | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const initMedia = useCallback(async () => {
        if (!enabled) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
                audio: true,
            });
            streamRef.current = stream;

            const audio = stream.getAudioTracks()[0] || null;
            const video = stream.getVideoTracks()[0] || null;

            setLocalAudioTrack(audio);
            setLocalVideoTrack(video);
            setCamReady(true);
            setPermissionError(null);
            return stream;
        } catch (err: unknown) {
            console.warn("Camera or microphone permission denied / unavailable:", err);
            setPermissionError("Camera or microphone access denied. You can still chat in Text-Only mode.");
            setCamReady(false);
            return null;
        }
    }, [enabled]);

    const toggleMute = useCallback(() => {
        if (localAudioTrack) {
            localAudioTrack.enabled = !localAudioTrack.enabled;
            setIsMuted(!localAudioTrack.enabled);
        }
    }, [localAudioTrack]);

    const toggleCamera = useCallback(() => {
        if (localVideoTrack) {
            localVideoTrack.enabled = !localVideoTrack.enabled;
            setIsCamOff(!localVideoTrack.enabled);
        }
    }, [localVideoTrack]);

    const stopAllTracks = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setLocalAudioTrack(null);
        setLocalVideoTrack(null);
        setCamReady(false);
    }, []);

    return {
        localAudioTrack,
        localVideoTrack,
        isMuted,
        isCamOff,
        camReady,
        permissionError,
        initMedia,
        toggleMute,
        toggleCamera,
        stopAllTracks,
    };
}

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Socket, io } from "socket.io-client";

const URL = "https://lonechat.onrender.com";

const iceConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ]
};

export const Room = ({
    name,
    localAudioTrack,
    localVideoTrack
}: {
    name: string,
    localAudioTrack: MediaStreamTrack | null,
    localVideoTrack: MediaStreamTrack | null,
}) => {
    const [_searchParams, _setSearchParams] = useSearchParams();
    const [lobby, setLobby] = useState(true);
    const [_socket, setSocket] = useState<null | Socket>(null);
    const [_sendingPc, setSendingPc] = useState<null | RTCPeerConnection>(null);
    const [_receivingPc, setReceivingPc] = useState<null | RTCPeerConnection>(null);
    const [_remoteVideoTrack, setRemoteVideoTrack] = useState<MediaStreamTrack | null>(null);
    const [_remoteAudioTrack, _setRemoteAudioTrack] = useState<MediaStreamTrack | null>(null);
    const [_remoteMediaStream, _setRemoteMediaStream] = useState<MediaStream | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
    const localVideoRef = useRef<HTMLVideoElement | null>(null);

    // Use refs to avoid stale closure issues
    const sendingPcRef = useRef<RTCPeerConnection | null>(null);
    const receivingPcRef = useRef<RTCPeerConnection | null>(null);
    const pendingCandidates = useRef<{candidate: RTCIceCandidateInit, type: string}[]>([]);

    useEffect(() => {
        const socket = io(URL);

        socket.on('send-offer', async ({roomId}) => {
            console.log("sending offer");
            setLobby(false);
            const pc = new RTCPeerConnection(iceConfig);
            sendingPcRef.current = pc;
            setSendingPc(pc);

            if (localVideoTrack) {
                pc.addTrack(localVideoTrack);
            }
            if (localAudioTrack) {
                pc.addTrack(localAudioTrack);
            }

            pc.onicecandidate = (e) => {
                if (e.candidate) {
                    socket.emit("add-ice-candidate", {
                        candidate: e.candidate,
                        type: "sender",
                        roomId
                    });
                }
            }

            pc.onnegotiationneeded = async () => {
                console.log("on negotiation needed, sending offer");
                const sdp = await pc.createOffer();
                await pc.setLocalDescription(sdp);
                socket.emit("offer", { sdp, roomId });
            }
        });

        socket.on("offer", async ({roomId, sdp: remoteSdp}) => {
            console.log("received offer");
            setLobby(false);
            const pc = new RTCPeerConnection(iceConfig);
            receivingPcRef.current = pc;
            setReceivingPc(pc);

            pc.ontrack = (e) => {
                console.log("ontrack fired!", e.track.kind);
                const { track } = e;
                if (remoteVideoRef.current) {
                    if (!remoteVideoRef.current.srcObject) {
                        remoteVideoRef.current.srcObject = new MediaStream();
                    }
                    (remoteVideoRef.current.srcObject as MediaStream).addTrack(track);
                    remoteVideoRef.current.play();
                }
                if (track.kind === "video") {
                    setRemoteVideoTrack(track);
                }
            }

            pc.onicecandidate = (e) => {
                if (!e.candidate) return;
                socket.emit("add-ice-candidate", {
                    candidate: e.candidate,
                    type: "receiver",
                    roomId
                });
            }

            await pc.setRemoteDescription(remoteSdp);

            // Flush any pending candidates that arrived early
            for (const {candidate} of pendingCandidates.current) {
                await pc.addIceCandidate(candidate);
            }
            pendingCandidates.current = [];

            const sdp = await pc.createAnswer();
            await pc.setLocalDescription(sdp);

            socket.emit("answer", { roomId, sdp });
        });

        socket.on("answer", async ({roomId: _roomId, sdp: remoteSdp}) => {
            console.log("loop closed");
            setLobby(false);
            if (sendingPcRef.current) {
                await sendingPcRef.current.setRemoteDescription(remoteSdp);
            }
        });

        socket.on("lobby", () => {
            setLobby(true);
        });

        socket.on("add-ice-candidate", async ({candidate, type}) => {
            console.log("add ice candidate from remote", type);
            if (type === "sender") {
                if (receivingPcRef.current) {
                    await receivingPcRef.current.addIceCandidate(candidate);
                } else {
                    // Queue it for later
                    pendingCandidates.current.push({candidate, type});
                }
            } else {
                if (sendingPcRef.current) {
                    await sendingPcRef.current.addIceCandidate(candidate);
                }
            }
        });

        setSocket(socket);
    }, [name]);

    useEffect(() => {
        if (localVideoRef.current && localVideoTrack) {
            localVideoRef.current.srcObject = new MediaStream([localVideoTrack]);
            localVideoRef.current.play();
        }
    }, [localVideoRef]);

    return <div>
        Hi {name}
        <video autoPlay width={400} height={400} ref={localVideoRef} />
        {lobby ? "Waiting to connect you to someone" : null}
        <video autoPlay width={400} height={400} ref={remoteVideoRef} />
    </div>
}

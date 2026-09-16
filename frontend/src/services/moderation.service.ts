import { ENV } from "../config/env";

export interface ModerationResult {
    flagged: boolean;
    reason?: string;
}

export async function checkVideoFrameForAbuse(videoElement: HTMLVideoElement): Promise<ModerationResult> {
    if (!ENV.SIGHTENGINE_USER || !ENV.SIGHTENGINE_SECRET) {
        return { flagged: false };
    }

    if (!videoElement || !videoElement.srcObject || videoElement.readyState < 2) {
        return { flagged: false };
    }

    try {
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 240;
        const ctx = canvas.getContext("2d");
        if (!ctx) return { flagged: false };

        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/jpeg", 0.7)
        );

        if (!blob) return { flagged: false };

        const formData = new FormData();
        formData.append("media", blob, "frame.jpg");
        formData.append("models", "nudity-2.0,weapon,recreational_drug");
        formData.append("api_user", ENV.SIGHTENGINE_USER);
        formData.append("api_secret", ENV.SIGHTENGINE_SECRET);

        const res = await fetch("https://api.sightengine.com/1.0/check.json", {
            method: "POST",
            body: formData,
        });

        if (!res.ok) return { flagged: false };

        const data = await res.json();
        const nudityScore = data?.nudity?.sexual_activity ?? 0;
        const weaponScore = data?.weapon ?? 0;
        const drugScore = data?.recreational_drug ?? 0;

        if (nudityScore > 0.7 || weaponScore > 0.7 || drugScore > 0.7) {
            return {
                flagged: true,
                reason: "Inappropriate content detected in video stream",
            };
        }

        return { flagged: false };
    } catch (err) {
        console.warn("Moderation check error:", err);
        return { flagged: false };
    }
}

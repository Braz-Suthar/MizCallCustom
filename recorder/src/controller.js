import { RtpStream } from "./rtpStream.js";
import { ClipController } from "./clipController.js";
import { sendToBackend } from "./ws.js";

const streams = new Map();
// userId → { userStream, hostStream, controller }

export function startUserRecording({
    hostId,
    userId,
    meetingId,
    userPort,
    hostPort,
    userPreSeconds = 2,
    hostPreSeconds = 5,
    userPostSeconds = 2,
    hostPostSeconds = 5,
}) {
    if (streams.has(userId)) {
        console.log("[recorder] START_USER ignored, already tracking", userId);
        return;
    }

    const controller = new ClipController({
        hostId,
        userId,
        meetingId,
        userPreSeconds,
        hostPreSeconds,
        userPostSeconds,
        hostPostSeconds,
    });

    controller.onFinalized = (meta) => {
        sendToBackend({
            type: "CLIP_FINALIZED",
            ...meta
        });
    };

    console.log("[recorder] START_USER", { hostId, userId, meetingId, userPort, hostPort });

    const userStream = new RtpStream({
        port: userPort,
        onPcm: (pcm) => controller.onUserPcm(pcm)
    });

    const hostStream = new RtpStream({
        port: hostPort,
        onPcm: (pcm) => controller.onHostPcm(pcm)
    });

    streams.set(userId, { userStream, hostStream, controller });
}

export function startClip(userId) {
    console.log("[recorder] START_CLIP", { userId });
    streams.get(userId)?.controller.start();
}

export function stopClip(userId) {
    console.log("[recorder] STOP_CLIP", { userId });
    streams.get(userId)?.controller.stop();
}

export function stopUserRecording(userId) {
    const entry = streams.get(userId);
    if (!entry) return;

    console.log("[recorder] STOP_USER", { userId });
    // ensure clip is finalized
    entry.controller.stop();
    entry.userStream.close();
    entry.hostStream.close();
    streams.delete(userId);
}
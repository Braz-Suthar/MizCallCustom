import { RtpStream } from "./rtpStream.js";
import { ClipController } from "./clipController.js";
import { sendToBackend } from "./ws.js";

const streams = new Map();
// userId → { stream, controller }

export function startUserRecording({ hostId, userId, port }) {
    if (streams.has(userId)) return;

    const controller = new ClipController({ hostId, userId, meetingId });

    controller.onFinalized = (meta) => {
        sendToBackend({
            type: "CLIP_FINALIZED",
            ...meta
        });
    };

    const stream = new RtpStream({
        port,
        onPcm: (pcm) => controller.onPcm(pcm)
    });

    streams.set(userId, { stream, controller });
}

export function startClip(userId) {
    streams.get(userId)?.controller.start();
}

export function stopClip(userId) {
    streams.get(userId)?.controller.stop();
}

export function stopUserRecording(userId) {
    const entry = streams.get(userId);
    if (!entry) return;

    entry.stream.close();
    streams.delete(userId);
}
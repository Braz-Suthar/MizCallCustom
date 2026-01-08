import { RtpStream } from "./rtpStream.js";
import { ClipController } from "./clipController.js";
import { sendToBackend } from "./ws.js";
import dgram from "dgram";

const streams = new Map();
// userId → { userStream, hostStream, controller, userPort, hostPort }
const reservedPorts = new Set();
const pendingStarts = new Set(); // startClip requests that arrived before stream setup

async function getFreeUdpPort() {
    return new Promise((resolve, reject) => {
        const socket = dgram.createSocket("udp4");
        socket.once("error", (err) => {
            socket.close();
            reject(err);
        });
        socket.bind(0, () => {
            const { port } = socket.address();
            socket.close();
            resolve(port);
        });
    });
}

async function reservePort() {
    for (let i = 0; i < 20; i++) {
        const port = await getFreeUdpPort();
        if (!reservedPorts.has(port)) {
            reservedPorts.add(port);
            return port;
        }
    }
    throw new Error("no free port");
}

function releasePort(port) {
    if (port) reservedPorts.delete(port);
}

export async function startUserRecording({
    hostId,
    userId,
    meetingId,
    userPreSeconds = 2,
    hostPreSeconds = 5,
    userPostSeconds = 2,
    hostPostSeconds = 5,
}) {
    if (streams.has(userId)) {
        console.log("[recorder] START_USER restart, stopping previous", userId);
        stopUserRecording(userId);
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

    let failed = false;
    let userPort = null;
    let hostPort = null;
    const fail = (reason) => {
        if (failed) return;
        failed = true;
        console.error("[recorder] START_USER failed", { userId, reason });
        stopUserRecording(userId);
        sendToBackend({
            type: "START_USER_RESULT",
            ok: false,
            reason,
            hostId,
            userId,
            meetingId,
            userPort,
            hostPort
        });
    };

    try {
        userPort = await reservePort();
        hostPort = await reservePort();
    } catch (err) {
        return fail("no free ports");
    }

    console.log("[recorder] START_USER", { hostId, userId, meetingId, userPort, hostPort });

    const userStream = new RtpStream({
        port: userPort,
        label: `user-${userId}`,
        onPcm: (pcm) => controller.onUserPcm(pcm),
        onError: fail
    });

    const hostStream = new RtpStream({
        port: hostPort,
        label: `host-${userId}`,
        onPcm: (pcm) => controller.onHostPcm(pcm),
        onError: fail
    });

    streams.set(userId, { userStream, hostStream, controller, userPort, hostPort });

    // If a START_CLIP arrived before streams were ready, honor it now.
    if (pendingStarts.has(userId)) {
        pendingStarts.delete(userId);
        controller.start();
        console.log("[recorder] START_CLIP (queued) now started", { userId });
    }

    // Notify backend that streams are up (optimistic). If bind fails later,
    // fail() will send ok:false.
    sendToBackend({
        type: "START_USER_RESULT",
        ok: true,
        hostId,
        userId,
        meetingId,
        userPort,
        hostPort
    });
}

export function startClip(userId) {
    const entry = streams.get(userId);
    if (!entry) {
        pendingStarts.add(userId);
        console.warn("[recorder] START_CLIP queued, no stream yet for", userId);
        return;
    }
    console.log("[recorder] START_CLIP", { userId });
    entry.controller.start();
}

export function stopClip(userId) {
    const entry = streams.get(userId);
    if (!entry) {
        console.warn("[recorder] STOP_CLIP ignored, no stream for", userId);
        return;
    }
    console.log("[recorder] STOP_CLIP", {
        userId,
        userPackets: entry.userStream.packets,
        hostPackets: entry.hostStream.packets,
        userBytes: entry.userStream.bytes,
        hostBytes: entry.hostStream.bytes,
    });
    entry.controller.stop();
}

export function stopUserRecording(userId) {
    const entry = streams.get(userId);
    if (!entry) {
        pendingStarts.delete(userId);
        return;
    }

    console.log("[recorder] STOP_USER", {
        userId,
        userPackets: entry.userStream.packets,
        hostPackets: entry.hostStream.packets,
        userBytes: entry.userStream.bytes,
        hostBytes: entry.hostStream.bytes,
    });
    // ensure clip is finalized
    entry.controller.stop();
    entry.userStream.close();
    entry.hostStream.close();
    releasePort(entry.userPort);
    releasePort(entry.hostPort);
    streams.delete(userId);
}
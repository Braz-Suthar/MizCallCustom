import WebSocket from "ws";
import { randomUUID } from "crypto";

const MEDIASOUP_HOST = process.env.MEDIASOUP_HOST || "127.0.0.1";
const MEDIASOUP_PORT = process.env.MEDIASOUP_PORT || 4000;


let socket;
const pending = new Map();

export function connectMediasoup() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        socket = new WebSocket(`ws://${MEDIASOUP_HOST}:${MEDIASOUP_PORT}`);

        const onOpen = () => {
            console.log("🔗 Connected to mediasoup");
            cleanup();
            resolve();
        };

        const onError = (err) => {
            cleanup();
            reject(err);
        };

        const cleanup = () => {
            socket?.off("open", onOpen);
            socket?.off("error", onError);
        };

        socket.on("open", onOpen);
        socket.on("error", onError);

        socket.on("message", (raw) => {
            const msg = JSON.parse(raw.toString());
            if (msg.requestId && pending.has(msg.requestId)) {
                pending.get(msg.requestId)(msg);
                pending.delete(msg.requestId);
            }
        });
    });
}

export function sendMediasoup(cmd) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        throw new Error("Mediasoup WS not connected");
    }

    return new Promise((resolve) => {
        const requestId = randomUUID();
        pending.set(requestId, resolve);
        socket.send(JSON.stringify({ ...cmd, requestId }));
    });
}
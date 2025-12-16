import WebSocket from "ws";
import { randomUUID } from "crypto";

const MEDIASOUP_WS = "ws://mediasoup:4000";

let socket;
const pending = new Map();

export function connectMediasoup() {
    socket = new WebSocket(MEDIASOUP_WS);

    socket.on("open", () => {
        console.log("🔗 Connected to mediasoup");
    });

    socket.on("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.requestId && pending.has(msg.requestId)) {
            pending.get(msg.requestId)(msg);
            pending.delete(msg.requestId);
        }
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
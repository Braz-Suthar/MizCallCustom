import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import {
    createRoom,
    joinRoom,
    getRoom,
    closeRoom
} from "./rooms.js";
import { EVENTS } from "./protocol.js";
import { sendMediasoup } from "../mediasoup/client.js";
import { MS } from "../mediasoup/commands.js";

const SECRET = process.env.JWT_SECRET;
let wssInstance = null;

export function broadcastCallEvent(hostId, payload) {
    if (!wssInstance) return;
    const msg = JSON.stringify(payload);
    wssInstance.clients.forEach((client) => {
        if (
            client.readyState === 1 &&
            client.auth?.role === "user" &&
            client.auth?.hostId === hostId
        ) {
            client.send(msg);
        }
    });
}

export function startWebSocketServer(httpServer) {
    const wss = new WebSocketServer({ server: httpServer });
    wssInstance = wss;

    wss.on("connection", (socket) => {
        socket.on("message", async (raw) => {
            try {
                const msg = JSON.parse(raw.toString());

                /* AUTH MESSAGE */
                if (msg.type === EVENTS.AUTH) {
                    const data = jwt.verify(msg.token, SECRET);
                    socket.auth = data;
                    return;
                }

                if (!socket.auth) return;

                const { role } = socket.auth;

                if (msg.type === EVENTS.CALL_STARTED && role === "host") {
                    socket.roomId = msg.roomId;
                    createRoom(msg.roomId, socket);

                    await sendMediasoup({
                        type: MS.CREATE_ROOM,
                        roomId: msg.roomId
                    });

                    broadcastCallEvent(socket.auth.hostId, {
                        type: EVENTS.CALL_STARTED,
                        roomId: msg.roomId
                    });

                    return;
                }

                /* USER JOINS CALL */
                if (msg.type === EVENTS.USER_JOINED && role === "user") {
                    const ok = joinRoom(msg.roomId, socket.auth.userId, socket);
                    if (!ok) return;

                    const room = getRoom(msg.roomId);
                    room.hostSocket.send(
                        JSON.stringify({
                            type: EVENTS.USER_JOINED,
                            userId: socket.auth.userId
                        })
                    );
                    return;
                }

                /* SPEAKING EVENTS */
                if (
                    msg.type === EVENTS.SPEAKING_START ||
                    msg.type === EVENTS.SPEAKING_STOP
                ) {
                    const room = getRoom(msg.roomId);
                    if (!room) return;

                    room.hostSocket.send(
                        JSON.stringify({
                            type: msg.type,
                            userId: socket.auth.userId,
                            timestamp: Date.now()
                        })
                    );
                }

                if (msg.type === EVENTS.SPEAKING_START && role === "user") {
                    const room = getRoom(msg.roomId);
                    if (!room) return;

                    const { producerId } = await sendMediasoup({
                        type: MS.PRODUCE,
                        roomId: msg.roomId,
                        ownerId: socket.auth.userId,
                        transportId: msg.transportId,
                        rtpParameters: msg.rtpParameters
                    });

                    // host consumes user
                    await sendMediasoup({
                        type: MS.CONSUME,
                        roomId: msg.roomId,
                        producerOwnerId: socket.auth.userId,
                        transportId: room.hostSocket.transportId,
                        rtpCapabilities: room.hostSocket.rtpCapabilities
                    });

                    return;
                }

                if (msg.type === EVENTS.SPEAKING_STOP && role === "user") {
                    // later we’ll close producer + trigger recorder stop
                }

                if (msg.type === EVENTS.CREATE_TRANSPORT) {
                    const response = await sendMediasoup({
                        type: MS.CREATE_TRANSPORT,
                        roomId: msg.roomId
                    });

                    socket.send(JSON.stringify({
                        type: "transport-created",
                        data: response
                    }));
                }
            } catch (e) {
                console.error("WS error:", e.message);
            }
        });

        socket.on("close", () => {
            if (socket.auth?.role === "host" && socket.roomId) {
                broadcastCallEvent(socket.auth.hostId, {
                    type: EVENTS.CALL_STOPPED,
                    roomId: socket.roomId
                });
            }
        });
    });
}
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

const roomState = new Map();

function getState(roomId) {
    return roomState.get(roomId);
}

function ensureState(roomId) {
    if (!roomState.has(roomId)) {
        roomState.set(roomId, {
            hostSocket: null,
            hostProducerId: null,
            routerRtpCapabilities: null,
            transports: new Map(), // transportId -> { socket, role, ownerId }
            producers: new Map(), // ownerId -> producerId
        });
    }
    return roomState.get(roomId);
}

export function broadcastCallEvent(hostId, payload) {
    if (!wssInstance) return;
    const msg = JSON.stringify(payload);
    console.log("[WS] broadcast", payload, "targetHost:", hostId);
    let sent = 0;
    wssInstance.clients.forEach((client) => {
        if (
            client.readyState === 1 &&
            client.auth?.role === "user"
        ) {
            console.log("[WS] -> user", client.auth?.userId);
            client.send(msg);
            sent += 1;
        }
    });
    console.log("[WS] broadcast delivered to", sent, "clients");
}

export function startWebSocketServer(httpServer) {
    const wss = new WebSocketServer({ server: httpServer });
    wssInstance = wss;

    wss.on("connection", (socket) => {
        console.log("[WS] connection open");
        socket.on("message", async (raw) => {
            try {
                const msg = JSON.parse(raw.toString());

                /* AUTH MESSAGE */
                if (msg.type === EVENTS.AUTH) {
                    try {
                        const data = jwt.verify(msg.token, SECRET);
                        socket.auth = data;
                        console.log("[WS] authed", data);
                        return;
                    } catch (err) {
                        console.error("[WS] auth failed:", err.message);
                        socket.close();
                        return;
                    }
                }

                if (!socket.auth) return;

                const { role } = socket.auth;

                if (msg.type === EVENTS.CALL_STARTED && role === "host") {
                    socket.roomId = msg.roomId;
                    createRoom(msg.roomId, socket);

                    const res = await sendMediasoup({
                        type: MS.CREATE_ROOM,
                        roomId: msg.roomId
                    });

                    const state = ensureState(msg.roomId);
                    state.hostSocket = socket;
                    state.routerRtpCapabilities = res?.rtpCapabilities || null;

                    broadcastCallEvent(socket.auth.hostId, {
                        type: EVENTS.CALL_STARTED,
                        roomId: msg.roomId,
                        routerRtpCapabilities: state.routerRtpCapabilities
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

                /* CREATE TRANSPORT */
                if (msg.type === EVENTS.CREATE_TRANSPORT) {
                    const state = ensureState(msg.roomId);
                    const response = await sendMediasoup({
                        type: MS.CREATE_TRANSPORT,
                        roomId: msg.roomId
                    });

                    state.transports.set(response.id, {
                        socket,
                        role,
                        ownerId: role === "host" ? socket.auth.hostId : socket.auth.userId
                    });

                    socket.send(JSON.stringify({
                        type: "transport-created",
                        data: response
                    }));
                    return;
                }

                /* CONNECT TRANSPORT */
                if (msg.type === "connect-transport") {
                    await sendMediasoup({
                        type: MS.CONNECT_TRANSPORT,
                        roomId: msg.roomId,
                        transportId: msg.transportId,
                        dtlsParameters: msg.dtlsParameters
                    });
                    socket.send(JSON.stringify({
                        type: "transport-connected",
                        transportId: msg.transportId
                    }));
                    return;
                }

                /* PRODUCE */
                if (msg.type === "produce") {
                    const ownerId = role === "host" ? socket.auth.hostId : socket.auth.userId;
                    const res = await sendMediasoup({
                        type: MS.PRODUCE,
                        roomId: msg.roomId,
                        transportId: msg.transportId,
                        rtpParameters: msg.rtpParameters,
                        ownerId
                    });

                    const state = ensureState(msg.roomId);
                    state.producers.set(ownerId, res.producerId);
                    if (role === "host") {
                        state.hostProducerId = res.producerId;
                        broadcastCallEvent(socket.auth.hostId, {
                            type: "host-producer",
                            roomId: msg.roomId,
                            producerId: res.producerId,
                            routerRtpCapabilities: state.routerRtpCapabilities
                        });
                    }

                    socket.send(JSON.stringify({
                        type: "produced",
                        producerId: res.producerId,
                        recorder: res.recorder
                    }));
                    return;
                }

                /* CONSUME */
                if (msg.type === "consume") {
                    const res = await sendMediasoup({
                        type: MS.CONSUME,
                        roomId: msg.roomId,
                        transportId: msg.transportId,
                        producerOwnerId: msg.producerOwnerId,
                        rtpCapabilities: msg.rtpCapabilities
                    });

                    socket.send(JSON.stringify({
                        type: "consumed",
                        consumer: res
                    }));
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
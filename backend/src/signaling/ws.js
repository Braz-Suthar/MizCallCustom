import { WebSocketServer } from "ws";
import { verifyToken as verifyJwt } from "../services/auth.js";
import { Peer } from "./peer.js";
import { sendMediasoup } from "../mediasoup/client.js";
import { MS } from "../mediasoup/commands.js";
import { v4 as uuid } from "uuid";
import { sendRecorder } from "../recorder/client.js";
import { EVENTS } from "./protocol.js";

const peers = new Map();
let wssInstance = null;

// roomId -> { routerRtpCapabilities, peers: Map<peerId, Peer>, producerIdToOwner: Map, hostProducerId?: string, hostId?: string }
const rooms = new Map();

const RECORDER_PORT_START = Number(process.env.RECORDER_PORT_START || 50000);
let recorderPortCursor = RECORDER_PORT_START;
function allocRecorderPort() {
  const port = recorderPortCursor++;
  if (recorderPortCursor > RECORDER_PORT_START + 1000) {
    recorderPortCursor = RECORDER_PORT_START;
  }
  return port;
}

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      routerRtpCapabilities: null,
      peers: new Map(),
      producerIdToOwner: new Map(),
      hostProducerId: null,
      hostId: null,
    });
  }
  return rooms.get(roomId);
}

export async function ensureMediasoupRoom(roomId) {
  const room = getRoom(roomId);
  if (room.routerRtpCapabilities) return room;
  const res = await sendMediasoup({
    type: MS.CREATE_ROOM,
    roomId,
  });
  room.routerRtpCapabilities = res?.rtpCapabilities ?? null;
  return room;
}

export async function startWebSocketServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer });
  wssInstance = wss;
  wss.on("connection", (socket) => {
    console.log("[WS] connection open");
    handleSocket({ socket });
  });
}

export function broadcastCallEvent(hostId, payload, roomId = null) {
  console.log("[WS] broadcast event", payload, "hostId", hostId);
  // attach router caps if we already have them for this room
  if (roomId) {
    const room = rooms.get(roomId);
    if (room?.routerRtpCapabilities && !payload.routerRtpCapabilities) {
      payload.routerRtpCapabilities = room.routerRtpCapabilities;
    }
  }
  const msg = JSON.stringify(payload);
  let sent = 0;
  for (const peer of peers.values()) {
    if (
      peer.socket.readyState === 1 &&
      peer.role === "user" &&
      peer.hostId === hostId
    ) {
      peer.socket.send(msg);
      sent += 1;
    }
  }
  console.log("[WS] broadcast delivered to", sent, "users");
}

export function handleSocket({ socket }) {
    let peer = null;

    async function startRecorderForUser(roomId, room, peer) {
        const userPort = allocRecorderPort();
        const hostPort = allocRecorderPort();
        const remoteIp = process.env.RECORDER_IP || "recorder";

        sendRecorder({
            type: "START_USER",
            hostId: peer.hostId,
            userId: peer.id,
            meetingId: roomId,
            userPort,
            hostPort,
            userPreSeconds: 2,
            hostPreSeconds: 5,
            userPostSeconds: 2,
            hostPostSeconds: 5,
        });
        sendRecorder({
            type: "START_CLIP",
            userId: peer.id
        });

        try {
            await sendMediasoup({
                type: MS.CREATE_RECORDER,
                roomId,
                producerOwnerId: peer.id,
                remotePort: userPort,
                remoteIp
            });

            if (room.hostProducerId) {
                await sendMediasoup({
                    type: MS.CREATE_RECORDER,
                    roomId,
                    producerOwnerId: peer.hostId,
                    remotePort: hostPort,
                    remoteIp
                });
            }
        } catch (err) {
            console.error("[WS] recorder plain transport failed", err?.message || err);
        }
    }

    const requirePeer = () => {
        if (!peer) throw new Error("Peer not initialized");
        return peer;
    };

    socket.on("message", async (raw) => {
        const msg = JSON.parse(raw.toString());
        try {
            console.log("[WS] message", msg.type, "from", peer?.id || "unauth");
        } catch {
            // ignore log errors
        }

        switch (msg.type) {

            /* ---------------- AUTH ONLY (for dashboards wanting push) ---------------- */
            case "auth":
            case "AUTH": {
                if (peer) break; // already authed
                try {
                    const decoded = verifyJwt(msg.token);
                    const role = decoded.role;
                    const userId = decoded.userId;
                    const hostId = decoded.hostId;
                    const id = role === "host" ? hostId : userId;
                    console.log("[WS] AUTH", { id, role, hostId, userId });
                    peer = new Peer({
                        id,
                        socket,
                        role,
                        hostId
                    });
                    peers.set(peer.id, peer);
                } catch (e) {
                    console.error("[WS] AUTH failed", e.message);
                }
                break;
            }

            /* ---------------- CALL STARTED (notify users) ---------------- */
            case "CALL_STARTED":
            case "call-started": {
                if (!peer || peer.role !== "host") break;
                // host can pass roomId; fallback to hostId scoped room
                const roomId = msg.roomId || peer.roomId || peer.hostId || "main-room";
                peer.roomId = roomId;
                const room = await ensureMediasoupRoom(roomId);
                if (!room.hostId) {
                  room.hostId = peer.hostId;
                }
                broadcastCallEvent(peer.hostId, {
                    type: "call-started",
                    roomId,
                    routerRtpCapabilities: room.routerRtpCapabilities ?? {},
                }, roomId);
                break;
            }

            /* ---------------- ROUTER CAPS REQUEST ---------------- */
            case "GET_ROUTER_CAPS":
            case "get-router-caps": {
                // a roomId is required; default to peer room or hostId bucket
                const roomId = msg.roomId || peer?.roomId || peer?.hostId || "main-room";
                const room = await ensureMediasoupRoom(roomId);
                socket.send(JSON.stringify({
                    type: "ROUTER_CAPS",
                    routerRtpCapabilities: room.routerRtpCapabilities,
                    hostProducerId: room.hostProducerId,
                }));
                break;
            }

            /* ---------------- REQUEST HOST PRODUCER ---------------- */
            case "REQUEST_HOST_PRODUCER": {
                const roomId = msg.roomId || peer?.roomId || peer?.hostId || "main-room";
                const room = getRoom(roomId);
                if (room?.hostProducerId) {
                    socket.send(JSON.stringify({
                        type: "HOST_PRODUCER",
                        producerId: room.hostProducerId,
                        routerRtpCapabilities: room.routerRtpCapabilities ?? null,
                    }));
                }
                break;
            }

            /* ---------------- JOIN ---------------- */
            case "JOIN": {
                const decoded = verifyJwt(msg.token);
                const role = decoded.role;
                const userId = decoded.userId;
                const hostId = decoded.hostId;
                const id = role === "host" ? hostId : userId;
                console.log("[WS] JOIN", { id, role, hostId, userId });

                const roomId = msg.roomId || msg.roomID || peer?.roomId || hostId || "main-room";
                const room = await ensureMediasoupRoom(roomId);
                console.log("[WS] JOIN resolve room", { id, role, roomId });

                peer = new Peer({
                    id,
                    socket,
                    role,
                    hostId
                });
                peer.roomId = roomId;
                peer.hostId = hostId;

                peers.set(peer.id, peer);
                getRoom(roomId).peers.set(peer.id, peer);

                // SEND transport via mediasoup-server
                const sendT = await sendMediasoup({
                    type: MS.CREATE_TRANSPORT,
                    roomId,
                });
                peer.sendTransport = { id: sendT.id };

                socket.send(JSON.stringify({
                    type: "SEND_TRANSPORT_CREATED",
                    params: {
                        id: sendT.id,
                        iceParameters: sendT.iceParameters,
                        iceCandidates: sendT.iceCandidates,
                        dtlsParameters: sendT.dtlsParameters,
                    }
                }));

                // RECV transport
                const recvT = await sendMediasoup({
                    type: MS.CREATE_TRANSPORT,
                    roomId,
                });
                peer.recvTransport = { id: recvT.id };

                socket.send(JSON.stringify({
                    type: "RECV_TRANSPORT_CREATED",
                    params: {
                        id: recvT.id,
                        iceParameters: recvT.iceParameters,
                        iceCandidates: recvT.iceCandidates,
                        dtlsParameters: recvT.dtlsParameters,
                    }
                }));

                socket.send(JSON.stringify({
                    type: "TURN_CONFIG",
                    iceServers: [
                      {
                        urls: process.env.TURN_URLS.split(","),
                        username: process.env.TURN_USERNAME,
                        credential: process.env.TURN_PASSWORD,
                      }
                    ]
                  }));

                // tell a newly joined user about existing host producer if present
                if (peer.role === "user" && room.hostProducerId) {
                  socket.send(JSON.stringify({
                    type: "HOST_PRODUCER",
                    producerId: room.hostProducerId,
                    routerRtpCapabilities: room.routerRtpCapabilities ?? null,
                  }));
                }

                // notify hosts when a user joins so UI can update
                if (peer.role === "user") {
                  for (const other of room.peers.values()) {
                    if (other.role === "host" && other.socket.readyState === 1) {
                      other.socket.send(JSON.stringify({
                        type: "USER_JOINED",
                        userId: id,
                      }));
                    }
                  }
                }

                break;
            }

            /* -------- CONNECT SEND TRANSPORT -------- */
            case "CONNECT_SEND_TRANSPORT": {
                const roomId = peer?.roomId || msg.roomId || peer?.hostId || "main-room";
                console.log("[WS] CONNECT_SEND_TRANSPORT", { roomId, id: requirePeer().id });
                await sendMediasoup({
                    type: MS.CONNECT_TRANSPORT,
                    roomId,
                    transportId: requirePeer().sendTransport.id,
                    dtlsParameters: msg.dtlsParameters,
                });
                break;
            }

            /* -------- CONNECT RECV TRANSPORT -------- */
            case "CONNECT_RECV_TRANSPORT": {
                const roomId = peer?.roomId || msg.roomId || peer?.hostId || "main-room";
                console.log("[WS] CONNECT_RECV_TRANSPORT", { roomId, id: requirePeer().id });
                await sendMediasoup({
                    type: MS.CONNECT_TRANSPORT,
                    roomId,
                    transportId: requirePeer().recvTransport.id,
                    dtlsParameters: msg.dtlsParameters,
                });
                break;
            }

            /* ---------------- PRODUCE ---------------- */
            case "PRODUCE": {
                const roomId = peer?.roomId || msg.roomId || peer?.hostId || "main-room";
                const room = await ensureMediasoupRoom(roomId);
                console.log("[WS] PRODUCE incoming", { roomId, owner: peer.id, hasSend: !!peer.sendTransport });
                try {
                    const res = await sendMediasoup({
                        type: MS.PRODUCE,
                        roomId,
                        transportId: requirePeer().sendTransport.id,
                        rtpParameters: msg.rtpParameters,
                        ownerId: peer.id,
                    });
                    console.log("[WS] PRODUCE room", roomId, "peer", peer.id);
                    peer.producer = { id: res.producerId };
                    room.producerIdToOwner.set(res.producerId, peer.id);
                    if (peer.role === "host") {
                      room.hostProducerId = res.producerId;
                      // notify all users in the room about the host producer
                      for (const other of room.peers.values()) {
                        if (other.role === "user" && other.socket.readyState === 1) {
                          other.socket.send(
                            JSON.stringify({
                              type: "HOST_PRODUCER",
                              producerId: res.producerId,
                              routerRtpCapabilities: room.routerRtpCapabilities ?? null,
                            })
                          );
                        }
                      }
                    }
                    console.log("[WS] PRODUCE", { ownerId: peer.id, producerId: res.producerId });

                    if (peer.role === "user") {
                        await startRecorderForUser(roomId, room, peer);
                    }
                } catch (e) {
                    console.error("[WS] PRODUCE failed", e?.message || e);
                    socket.send(JSON.stringify({ type: "PRODUCE_ERROR", error: e?.message || "produce failed" }));
                }

                // Notify other peers in same room based on role (users hear host; host hears everyone)
                for (const other of room.peers.values()) {
                    if (other.id === peer.id || other.socket.readyState !== 1) continue;
                    if (peer.role === "host" && other.role === "user") {
                        other.socket.send(JSON.stringify({
                            type: "NEW_PRODUCER",
                            producerId: peer.producer.id,
                            ownerRole: "host",
                        }));
                    }
                    if (peer.role === "user" && other.role === "host") {
                        other.socket.send(JSON.stringify({
                            type: "NEW_PRODUCER",
                            producerId: peer.producer.id,
                            ownerRole: "user",
                            userId: peer.id,
                        }));
                    }
                }

                socket.send(JSON.stringify({
                    type: "PRODUCER_CREATED",
                    producerId: peer.producer.id,
                }));

                break;
            }

            /* ---------------- CONSUME ---------------- */
            case "CONSUME": {
                const roomId = peer?.roomId || msg.roomId || peer?.hostId || "main-room";
                const room = getRoom(roomId);
                const ownerId =
                  msg.producerOwnerId ??
                  room?.producerIdToOwner.get(msg.producerId) ??
                  msg.producerId; // fallback
                const caps = msg.rtpCapabilities || room?.routerRtpCapabilities || {};
                const res = await sendMediasoup({
                    type: MS.CONSUME,
                    roomId,
                    transportId: requirePeer().recvTransport.id,
                    producerOwnerId: ownerId,
                    rtpCapabilities: caps,
                });
                console.log("[WS] CONSUME", { consumerId: res.id, producerOwnerId: msg.producerOwnerId });

                socket.send(JSON.stringify({
                    type: "CONSUMER_CREATED",
                    params: {
                        id: res.id,
                        producerId: res.producerId,
                        kind: res.kind,
                        rtpParameters: res.rtpParameters,
                    }
                }));
                break;
            }

            /* ---------------- SPEAKING STOP ---------------- */
            case EVENTS.SPEAKING_STOP:
            case "SPEAKING_STOP":
            case "speaking-stop": {
                if (!peer) break;
                sendRecorder({ type: "STOP_CLIP", userId: peer.id });
                sendRecorder({ type: "STOP_USER", userId: peer.id });
                break;
            }

            /* ------------ PUSH TO TALK ------------- */
            case "PTT_START":
                // Not implemented with mediasoup server shim
                break;

            case "PTT_STOP":
                // Not implemented with mediasoup server shim
                break;

            default:
                console.log("[WS] unhandled message", msg.type);
        }
    });

    socket.on("close", () => {
        if (!peer) return;

        peer.producer = null;
        peer.sendTransport = null;
        peer.recvTransport = null;

        peers.delete(peer.id);
        if (peer.roomId) {
          const room = rooms.get(peer.roomId);
          room?.peers.delete(peer.id);
          // notify host when user disconnects
          if (peer.role === "user" && room) {
            for (const other of room.peers.values()) {
              if (other.role === "host" && other.socket.readyState === 1) {
                other.socket.send(JSON.stringify({
                  type: "USER_LEFT",
                  userId: peer.id,
                }));
              }
            }
          }
        }
    });
}
import { WebSocketServer } from "ws";
import { verifyToken as verifyJwt } from "../services/auth.js";
import { Peer } from "./peer.js";
import { sendMediasoup } from "../mediasoup/client.js";
import { MS } from "../mediasoup/commands.js";
import { v4 as uuid } from "uuid";

const ROOM_ID = "main-room";

let routerRtpCapabilities = null;
const peers = new Map();
let wssInstance = null;
const producerIdToOwner = new Map();

async function ensureRoom() {
  if (routerRtpCapabilities) return;
  const res = await sendMediasoup({
    type: MS.CREATE_ROOM,
    roomId: ROOM_ID,
  });
  routerRtpCapabilities = res?.rtpCapabilities ?? null;
}

export async function startWebSocketServer(httpServer) {
  await ensureRoom();
  const wss = new WebSocketServer({ server: httpServer });
  wssInstance = wss;
  wss.on("connection", (socket) => {
    console.log("[WS] connection open");
    handleSocket({ socket });
  });
}

export function broadcastCallEvent(hostId, payload) {
  console.log("[WS] broadcast event", payload, "hostId", hostId);
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

    const requirePeer = () => {
        if (!peer) throw new Error("Peer not initialized");
        return peer;
    };

    socket.on("message", async (raw) => {
        const msg = JSON.parse(raw.toString());

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
                await ensureRoom();
                broadcastCallEvent(peer.hostId, {
                    type: "call-started",
                    roomId: ROOM_ID,
                    routerRtpCapabilities: routerRtpCapabilities ?? {},
                });
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

                peer = new Peer({
                    id,
                    socket,
                    role
                });
                peer.hostId = hostId;

                peers.set(peer.id, peer);

                await ensureRoom();

                // SEND transport via mediasoup-server
                const sendT = await sendMediasoup({
                    type: MS.CREATE_TRANSPORT,
                    roomId: ROOM_ID,
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
                    roomId: ROOM_ID,
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

                break;
            }

            /* -------- CONNECT SEND TRANSPORT -------- */
            case "CONNECT_SEND_TRANSPORT": {
                await sendMediasoup({
                    type: MS.CONNECT_TRANSPORT,
                    roomId: ROOM_ID,
                    transportId: requirePeer().sendTransport.id,
                    dtlsParameters: msg.dtlsParameters,
                });
                break;
            }

            /* -------- CONNECT RECV TRANSPORT -------- */
            case "CONNECT_RECV_TRANSPORT": {
                await sendMediasoup({
                    type: MS.CONNECT_TRANSPORT,
                    roomId: ROOM_ID,
                    transportId: requirePeer().recvTransport.id,
                    dtlsParameters: msg.dtlsParameters,
                });
                break;
            }

            /* ---------------- PRODUCE ---------------- */
            case "PRODUCE": {
                const res = await sendMediasoup({
                    type: MS.PRODUCE,
                    roomId: ROOM_ID,
                    transportId: requirePeer().sendTransport.id,
                    rtpParameters: msg.rtpParameters,
                    ownerId: peer.id,
                });
                peer.producer = { id: res.producerId };
                producerIdToOwner.set(res.producerId, peer.id);
                console.log("[WS] PRODUCE", { ownerId: peer.id, producerId: res.producerId });

                // Notify other peers
                for (const other of peers.values()) {
                    if (other.id !== peer.id) {
                        other.socket.send(JSON.stringify({
                            type: "NEW_PRODUCER",
                            producerId: peer.producer.id,
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
                const ownerId =
                  msg.producerOwnerId ??
                  producerIdToOwner.get(msg.producerId) ??
                  msg.producerId; // fallback
                const res = await sendMediasoup({
                    type: MS.CONSUME,
                    roomId: ROOM_ID,
                    transportId: requirePeer().recvTransport.id,
                    producerOwnerId: ownerId,
                    // Use router caps since legacy client doesn't send rtpCapabilities
                    rtpCapabilities: routerRtpCapabilities ?? {},
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
    });
}
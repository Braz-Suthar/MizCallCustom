import { WebSocketServer } from "ws";
import mediasoup from "mediasoup";
import { createWebRtcTransport } from "../mediasoup/transports.js";
import { verifyToken as verifyJwt } from "../services/auth.js";
import { Peer } from "./peer.js";
import { v4 as uuid } from "uuid";

const mediaCodecs = [
  {
    kind: "audio",
    mimeType: "audio/opus",
    clockRate: 48000,
    channels: 2,
  },
];

export async function startWebSocketServer(httpServer) {
  const worker = await mediasoup.createWorker();
  const router = await worker.createRouter({ mediaCodecs });
  const peers = new Map();

  const wss = new WebSocketServer({ server: httpServer });
  wss.on("connection", (socket) => {
    handleSocket({ socket, router, peers });
  });
}

export function handleSocket({ socket, router, peers }) {
    let peer = null;

    socket.on("message", async (raw) => {
        const msg = JSON.parse(raw.toString());

        switch (msg.type) {

            /* ---------------- JOIN ---------------- */
            case "JOIN": {
                const { userId, role } = verifyJwt(msg.token);

                peer = new Peer({
                    id: userId,
                    socket,
                    role
                });

                peers.set(peer.id, peer);

                // SEND transport
                peer.sendTransport = await createWebRtcTransport(router);

                socket.send(JSON.stringify({
                    type: "SEND_TRANSPORT_CREATED",
                    params: {
                        id: peer.sendTransport.id,
                        iceParameters: peer.sendTransport.iceParameters,
                        iceCandidates: peer.sendTransport.iceCandidates,
                        dtlsParameters: peer.sendTransport.dtlsParameters,
                    }
                }));

                // RECV transport
                peer.recvTransport = await createWebRtcTransport(router);

                socket.send(JSON.stringify({
                    type: "RECV_TRANSPORT_CREATED",
                    params: {
                        id: peer.recvTransport.id,
                        iceParameters: peer.recvTransport.iceParameters,
                        iceCandidates: peer.recvTransport.iceCandidates,
                        dtlsParameters: peer.recvTransport.dtlsParameters,
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
                await peer.sendTransport.connect({
                    dtlsParameters: msg.dtlsParameters
                });
                break;
            }

            /* -------- CONNECT RECV TRANSPORT -------- */
            case "CONNECT_RECV_TRANSPORT": {
                await peer.recvTransport.connect({
                    dtlsParameters: msg.dtlsParameters
                });
                break;
            }

            /* ---------------- PRODUCE ---------------- */
            case "PRODUCE": {
                peer.producer = await peer.sendTransport.produce({
                    kind: msg.kind,
                    rtpParameters: msg.rtpParameters,
                });

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
                const producerPeer = [...peers.values()]
                    .find(p => p.producer?.id === msg.producerId);

                if (!producerPeer) return;

                // Role-based audio rules
                if (
                    peer.role === "user" &&
                    producerPeer.role !== "host"
                ) {
                    return; // users hear only host
                }

                const consumer = await peer.recvTransport.consume({
                    producerId: msg.producerId,
                    rtpCapabilities: router.rtpCapabilities,
                    paused: false,
                });

                peer.consumers.set(consumer.id, consumer);

                socket.send(JSON.stringify({
                    type: "CONSUMER_CREATED",
                    params: {
                        id: consumer.id,
                        producerId: consumer.producerId,
                        kind: consumer.kind,
                        rtpParameters: consumer.rtpParameters,
                    }
                }));

                break;
            }

            /* ------------ PUSH TO TALK ------------- */
            case "PTT_START":
                peer.producer?.resume();
                break;

            case "PTT_STOP":
                peer.producer?.pause();
                break;
        }
    });

    socket.on("close", () => {
        if (!peer) return;

        peer.producer?.close();
        peer.sendTransport?.close();
        peer.recvTransport?.close();

        peers.delete(peer.id);
    });
}
import { WebSocketServer } from "ws";
import { createWorker } from "./worker.js";
import { createRouter } from "./router.js";
import { createWebRtcTransport } from "./transports.js";
import { v4 as uuid } from "uuid";
import dns from "dns";

const wss = new WebSocketServer({ port: 4000 });

const rooms = new Map();
/*
roomId -> {
  router,
  transports,
  producers,
  recorderTransports: Map<key, { plain, consumer }>
}
*/

const worker = await createWorker();

async function createPlainTransport(router) {
    return router.createPlainTransport({
        listenIp: "0.0.0.0",
        rtcpMux: true,
        comedia: false
    });
}

async function handleProduce(room, transportId, rtpParameters) {
    const transport = room.transports.get(transportId);
    const producer = await transport.produce({
        kind: "audio",
        rtpParameters
    });
    return producer;
}

async function handleConsume(room, transportId, producer, rtpCapabilities) {
    const transport = room.transports.get(transportId);

    if (!room.router.canConsume({
        producerId: producer.id,
        rtpCapabilities
    })) return null;

    return transport.consume({
        producerId: producer.id,
        rtpCapabilities,
        paused: false
    });
}

wss.on("connection", async (socket) => {
    socket.on("message", async (raw) => {
        const msg = JSON.parse(raw.toString());

        if (msg.type === "create-room") {
            const router = await createRouter(worker);
            rooms.set(msg.roomId, { router, transports: new Map() });

            socket.send(JSON.stringify({
                requestId: msg.requestId,
                ok: true,
                rtpCapabilities: router.rtpCapabilities
            }));
        }

        if (msg.type === "create-transport") {
            const room = rooms.get(msg.roomId);
            const transport = await createWebRtcTransport(room.router);

            room.transports.set(transport.id, transport);

            socket.send(JSON.stringify({
                requestId: msg.requestId,
                id: transport.id,
                iceParameters: transport.iceParameters,
                iceCandidates: transport.iceCandidates,
                dtlsParameters: transport.dtlsParameters
            }));
        }

        if (msg.type === "connect-transport") {
            const room = rooms.get(msg.roomId);
            const transport = room.transports.get(msg.transportId);
            await transport.connect({ dtlsParameters: msg.dtlsParameters });
            socket.send(JSON.stringify({
                requestId: msg.requestId,
                ok: true
            }));
        }

        if (msg.type === "produce") {
            const room = rooms.get(msg.roomId);

            /* 1️⃣ Create Producer (WebRTC → mediasoup) */
            const producer = await handleProduce(
                room,
                msg.transportId,
                msg.rtpParameters
            );

            room.producers ??= new Map();
            room.producers.set(msg.ownerId, producer);

            socket.send(JSON.stringify({
                requestId: msg.requestId,
                producerId: producer.id,
                recorder: null
            }));
        }

        if (msg.type === "consume") {
            const room = rooms.get(msg.roomId);
            if (!room) {
                socket.send(JSON.stringify({
                    requestId: msg.requestId,
                    ok: false,
                    error: "room not found"
                }));
                return;
            }

            const producer = room.producers?.get(msg.producerOwnerId);
            if (!producer) {
                socket.send(JSON.stringify({
                    requestId: msg.requestId,
                    ok: false,
                    error: "producer not found"
                }));
                return;
            }

            const consumer = await handleConsume(
                room,
                msg.transportId,
                producer,
                msg.rtpCapabilities
            );

            if (!consumer) {
                socket.send(JSON.stringify({
                    requestId: msg.requestId,
                    ok: false,
                    error: "failed to create consumer"
                }));
                return;
            }

            socket.send(JSON.stringify({
                requestId: msg.requestId,
                ok: true,
                id: consumer.id,
                producerId: producer.id,
                rtpParameters: consumer.rtpParameters
            }));
        }

        if (msg.type === "create-recorder") {
            const room = rooms.get(msg.roomId);
            room.recorderTransports ??= new Map();

            const producer = room.producers.get(msg.producerOwnerId);
            if (!producer) {
                socket.send(JSON.stringify({
                    requestId: msg.requestId,
                    ok: false,
                    error: "producer not found"
                }));
                return;
            }

            const plain = await createPlainTransport(room.router);

            // resolve hostname to numeric IP because mediasoup requires an IP literal
            const host = msg.remoteIp || process.env.RECORDER_IP || "recorder";
            let targetIp = host;
            try {
                const lookup = await dns.promises.lookup(host);
                targetIp = lookup.address;
            } catch (e) {
                console.error("Recorder IP resolve failed, using raw host", host, e?.message || e);
            }

            await plain.connect({
                ip: targetIp,
                port: msg.remotePort
            });

            // Build minimal rtpCapabilities from the producer to preserve payload types/codecs
            const sourceExts =
                producer.rtpParameters.headerExtensions && producer.rtpParameters.headerExtensions.length > 0
                    ? producer.rtpParameters.headerExtensions
                    : room.router.rtpCapabilities.headerExtensions || [];

            const headerExtensions = sourceExts
                .filter((ext) => !ext.kind || ext.kind === "audio")
                .map((ext) => ({
                    ...ext,
                    kind: "audio",
                    preferredId: ext.preferredId ?? ext.id,
                }));

            const rtpCapabilities = {
                codecs: producer.rtpParameters.codecs,
                headerExtensions,
            };

            const consumer = await plain.consume({
                producerId: producer.id,
                rtpCapabilities,
                paused: false
            });
            await consumer.resume();

            const key = `${msg.producerOwnerId}:${msg.remotePort}`;
            room.recorderTransports.set(key, { plain, consumer });

            socket.send(JSON.stringify({
                requestId: msg.requestId,
                ok: true,
                plainTransportId: plain.id,
                consumerId: consumer.id
            }));
        }
    });
});

console.log("🎧 Mediasoup audio server running on :4000");
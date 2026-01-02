import { WebSocketServer } from "ws";
import { createWorker } from "./worker.js";
import { createRouter } from "./router.js";
import { createWebRtcTransport } from "./transports.js";
import { v4 as uuid } from "uuid";

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
        rtcpMux: false,
        comedia: true
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
            const producer = room.producers.get(msg.producerOwnerId);

            const consumer = await handleConsume(
                room,
                msg.transportId,
                producer,
                msg.rtpCapabilities
            );

            socket.send(JSON.stringify({
                requestId: msg.requestId,
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
            await plain.connect({
                ip: msg.remoteIp || process.env.RECORDER_IP || "recorder",
                port: msg.remotePort
            });

            const consumer = await plain.consume({
                producerId: producer.id,
                rtpCapabilities: room.router.rtpCapabilities,
                paused: false
            });

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
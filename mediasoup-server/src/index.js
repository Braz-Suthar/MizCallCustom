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
  webrtcTransports,
  producers,
  recorderTransports: Map<userId, PlainTransport>
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

            /* 2️⃣ Create PlainTransport for Recorder */
            const plainTransport = await createPlainTransport(room.router);

            room.recorderTransports ??= new Map();
            room.recorderTransports.set(msg.ownerId, plainTransport);

            /* 3️⃣ Pipe producer → recorder */
            await producer.pipeTo(plainTransport);

            /* 4️⃣ Respond back with recorder RTP info */
            socket.send(JSON.stringify({
                requestId: msg.requestId,
                producerId: producer.id,
                recorder: {
                    ip: plainTransport.tuple.localIp,
                    port: plainTransport.tuple.localPort,
                    rtcpPort: plainTransport.rtcpTuple.localPort
                }
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
    });
});

console.log("🎧 Mediasoup audio server running on :4000");
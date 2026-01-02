import { WebSocketServer } from "ws";
import {
    startUserRecording,
    startClip,
    stopClip,
    stopUserRecording
} from "./controller.js";
import { attachBackendSocket } from "./ws.js";

/*
We move previous logic into controller.js
index.js becomes the SERVICE ENTRYPOINT
*/

const wss = new WebSocketServer({ port: 7000 });

console.log("🎙 Recorder control WS running on :7000");

wss.on("connection", (socket) => {
    attachBackendSocket(socket);
    socket.on("message", (raw) => {
        try {
            const msg = JSON.parse(raw.toString());

            switch (msg.type) {
                case "START_USER":
                    startUserRecording({
                        hostId: msg.hostId,
                        userId: msg.userId,
                        meetingId: msg.meetingId,
                        userPort: msg.userPort,
                        hostPort: msg.hostPort,
                        userPreSeconds: msg.userPreSeconds,
                        hostPreSeconds: msg.hostPreSeconds,
                        userPostSeconds: msg.userPostSeconds,
                        hostPostSeconds: msg.hostPostSeconds,
                    });
                    break;

                case "START_CLIP":
                    startClip(msg.userId);
                    break;

                case "STOP_CLIP":
                    stopClip(msg.userId);
                    break;

                case "STOP_USER":
                    stopUserRecording(msg.userId);
                    break;
            }
        } catch (e) {
            console.error("Recorder WS error:", e.message);
        }
    });
});
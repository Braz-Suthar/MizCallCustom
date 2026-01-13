import WebSocket from "ws";
import { logInfo, logError, logWarn } from "../services/logger.js";
import { EventEmitter } from "events";
import { pool } from "../db/pool.js";

const RECORDER_WS = "ws://recorder:7000";
let socket = null;
export const recorderEvents = new EventEmitter(); // emits start_user_result

export function connectRecorder() {
  socket = new WebSocket(RECORDER_WS);

  socket.on("open", () => {
    console.log("🔗 Connected to recorder");
  });

  socket.on("error", (err) => {
    console.error("Recorder WS error:", err.message);
  });

  socket.on("message", async (raw) => {
    const msg = JSON.parse(raw.toString());

    if (msg.type === "CLIP_FINALIZED") {
      await pool.query(
        `INSERT INTO recordings
       (id, host_id, user_id, meeting_id, started_at, ended_at, file_path)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          msg.id,
          msg.hostId,
          msg.userId,
          msg.meetingId,
          msg.startedAt,
          msg.endedAt,
          msg.filePath
        ]
      );
    }

    if (msg.type === "START_USER_RESULT") {
      recorderEvents.emit("start_user_result", msg);
    }
  });
}

export function sendRecorder(message) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.warn("Recorder WS not connected yet");
    return;
  }

  socket.send(JSON.stringify(message));
}

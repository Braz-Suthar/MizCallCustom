import WebSocket from "ws";
import { pool } from "../db/pool.js";

const RECORDER_WS = "ws://recorder:7000";
let socket = null;
const recorderStarts = new Map(); // userId -> {hostId, meetingId}

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
      if (msg.ok) {
        // start clip only after recorder confirms streams are ready
        socket.send(JSON.stringify({ type: "START_CLIP", userId: msg.userId }));
        recorderStarts.set(msg.userId, { hostId: msg.hostId, meetingId: msg.meetingId });
      } else {
        console.error("[Recorder] START_USER failed:", msg.reason, {
          userId: msg.userId,
          hostId: msg.hostId,
          userPort: msg.userPort,
          hostPort: msg.hostPort,
        });
      }
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

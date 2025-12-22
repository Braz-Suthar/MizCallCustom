import express from "express";
import http from "http";

import authRoutes from "./api/auth/index.js";
import hostRoutes from "./api/host/index.js";
import recordingRoutes from "./api/recordings/index.js";
import recordingsRoutes from "./routes/recordings.js";

import { startWebSocketServer } from "./signaling/ws.js";
import { connectMediasoup } from "./mediasoup/client.js";
import { connectRecorder } from "./recorder/client.js";
import { runMigrations } from "./db/migrate.js";

const app = express();
app.use(express.json());

// Routes
app.use(recordingsRoutes);
app.use("/auth", authRoutes);
app.use("/host", hostRoutes);
app.use("/recordings", recordingRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Create HTTP server (required for WS)
const server = http.createServer(app);

// Boot sequence (ensure mediasoup first, then WS)
await runMigrations();
await connectMediasoup();
connectRecorder();
// Start WS signaling (requires mediasoup connection ready)
startWebSocketServer(server);

// 🔑 IMPORTANT: use env port
const PORT = Number(process.env.API_PORT) || 3100;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`MizCallCustom API + WS running on :${PORT}`);
});
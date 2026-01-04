import express from "express";
import http from "http";

import authRoutes from "./api/auth/index.js";
import hostRoutes from "./api/host/index.js";
import recordingRoutes from "./api/recordings/index.js";
import recordingsRoutes from "./routes/recordings.js";
import { requireAuth } from "./middleware/auth.js";

import { startWebSocketServer } from "./signaling/socket-io.js";
import { connectMediasoup } from "./mediasoup/client.js";
import { connectRecorder } from "./recorder/client.js";
import { runMigrations } from "./db/migrate.js";

const app = express();
app.use(express.json());

// Basic CORS to allow Electron/Vite and our custom domain
app.use((req, res, next) => {
  const origin = req.headers.origin || "*";
  res.header("Access-Control-Allow-Origin", origin);
  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// Routes
app.use("/auth", authRoutes);
app.use(requireAuth, recordingsRoutes);
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
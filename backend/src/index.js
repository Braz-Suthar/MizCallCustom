import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import os from "os";

import authRoutes from "./api/auth/index.js";
import adminRoutes from "./api/admin/index.js";
import hostRoutes from "./api/host/index.js";
import userRoutes from "./api/user/index.js";
import recordingRoutes from "./api/recordings/index.js";
import notificationsRoutes from "./api/notifications/index.js";
import recordingsRoutes from "./routes/recordings.js";
import { requireAuth } from "./middleware/auth.js";

import { startWebSocketServer } from "./signaling/socket-io.js";
import { connectMediasoup } from "./mediasoup/client.js";
import { connectRecorder } from "./recorder/client.js";
import { runMigrations } from "./db/migrate.js";
import { initializeFirebase } from "./services/firebase.js";
import { query } from "./services/db.js";
import logger, { logInfo } from "./services/logger.js";
import { register as metricsRegister, metricsMiddleware, updateMetrics } from "./services/metrics.js";

const app = express();
app.use(express.json());

// Add metrics middleware
app.use(metricsMiddleware);

// Static uploads
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

// Static public files (inbuilt backgrounds, etc.)
const publicDir = path.join(process.cwd(), "public");
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
app.use("/public", express.static(publicDir));

// Enhanced CORS to allow Electron/Vite and our custom domain
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Allow all origins (for development) or specific domains (for production)
  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
  } else {
    res.header("Access-Control-Allow-Origin", "*");
  }
  
  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Device-Name");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Max-Age", "86400"); // Cache preflight for 24 hours
  
  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  
  next();
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Prometheus metrics endpoint
app.get("/metrics", async (req, res) => {
  try {
    res.set('Content-Type', metricsRegister.contentType);
    res.end(await metricsRegister.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

// Routes
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use(requireAuth, recordingsRoutes);
app.use("/host", hostRoutes);
app.use("/user", userRoutes);
app.use("/recordings", recordingRoutes);
app.use("/notifications", notificationsRoutes);

// Create HTTP server (required for WS)
const server = http.createServer(app);

// Boot sequence (ensure mediasoup first, then WS)
logInfo('Starting MizCall backend...', 'backend');

await runMigrations();
logInfo('Database migrations completed', 'database');

initializeFirebase(); // Initialize FCM (optional, won't crash if not configured)
logInfo('Firebase initialized', 'backend');

await connectMediasoup();
logInfo('Mediasoup connected', 'mediasoup');

connectRecorder();
logInfo('Recorder client connected', 'recorder');

// Start WS signaling (requires mediasoup connection ready)
startWebSocketServer(server);
logInfo('WebSocket server started', 'backend');

// 🔑 IMPORTANT: use env port
const PORT = Number(process.env.API_PORT) || 3100;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`MizCallCustom API + WS running on :${PORT}`);
  logInfo(`MizCallCustom API started on port ${PORT}`, 'backend');
  
  // Update Prometheus metrics every 30 seconds
  setInterval(() => {
    updateMetrics(query);
  }, 30000);
  
  // Initial metrics update
  updateMetrics(query);
});
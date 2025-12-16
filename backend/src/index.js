import express from "express";
import authRoutes from "./api/auth/index.js";
import hostRoutes from "./api/host/index.js";
import recordingRoutes from "./api/recordings/index.js";
import http from "http";
import { startWebSocketServer } from "./signaling/server.js";
import { connectMediasoup } from "./mediasoup/client.js";
import { connectRecorder } from "./recorder/client.js";
import { runMigrations } from "./db/migrate.js";
import recordingsRoutes from "./routes/recordings.js";



const app = express();
app.use(express.json());

const server = http.createServer(app);
startWebSocketServer(server);

app.use(recordingsRoutes);
app.use("/auth", authRoutes);
app.use("/host", hostRoutes);
app.use("/recordings", recordingRoutes);

await runMigrations();
connectRecorder();
connectMediasoup();

server.listen(3000, () =>
  console.log("MizCallCustom API + WS running on :3000")
);

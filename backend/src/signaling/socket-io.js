import { Server } from "socket.io";
import { verifyToken as verifyJwt } from "../services/auth.js";
import { Peer } from "./peer.js";
import { sendMediasoup } from "../mediasoup/client.js";
import { MS } from "../mediasoup/commands.js";
import { v4 as uuid } from "uuid";
import { sendRecorder } from "../recorder/client.js";

const peers = new Map();
let io = null;

// roomId -> { routerRtpCapabilities, peers: Map<peerId, Peer>, producerIdToOwner: Map, hostProducerId?: string, hostId?: string }
const rooms = new Map();

// Export peers and getRoom for API access
export { peers };

const RECORDER_PORT_START = Number(process.env.RECORDER_PORT_START || 55000);
let recorderPortCursor = RECORDER_PORT_START;

function allocRecorderPort() {
  const port = recorderPortCursor++;
  if (recorderPortCursor > RECORDER_PORT_START + 1000) {
    recorderPortCursor = RECORDER_PORT_START;
  }
  return port;
}

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      routerRtpCapabilities: null,
      peers: new Map(),
      producerIdToOwner: new Map(),
      hostProducerId: null,
      hostId: null,
    });
  }
  return rooms.get(roomId);
}

// Export getRoom for API access
export { getRoom };

export async function ensureMediasoupRoom(roomId) {
  const room = getRoom(roomId);
  if (room.routerRtpCapabilities) return room;
  const res = await sendMediasoup({
    type: MS.CREATE_ROOM,
    roomId,
  });
  room.routerRtpCapabilities = res?.rtpCapabilities ?? null;
  return room;
}

export async function startWebSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true
    },
    // Important: Configure for stability
    pingTimeout: 60000,        // How long to wait for pong before closing
    pingInterval: 25000,       // How often to send ping
    upgradeTimeout: 30000,     // Time to wait for upgrade
    maxHttpBufferSize: 1e8,    // 100 MB
    transports: ['websocket', 'polling'],  // Allow both
    allowEIO3: true,           // Compatibility
  });

  console.log("[Socket.IO] Server starting...");

  io.on("connection", (socket) => {
    console.log("[Socket.IO] Client connected:", socket.id);
    handleSocket({ socket, io });

    socket.on("disconnect", (reason) => {
      console.log("[Socket.IO] Client disconnected:", socket.id, "Reason:", reason);
      
      // Cleanup peer
      for (const [peerId, peer] of peers.entries()) {
        if (peer.socket === socket) {
          // finalize any recorder session for this user
          if (peer.role === "user") {
            sendRecorder({ type: "STOP_CLIP", userId: peer.id });
            sendRecorder({ type: "STOP_USER", userId: peer.id });
          }
          peers.delete(peerId);
          
          // Remove from rooms
          for (const room of rooms.values()) {
            room.peers.delete(peerId);
          }
          
          console.log("[Socket.IO] Cleaned up peer:", peerId);
          break;
        }
      }
    });

    socket.on("error", (error) => {
      console.error("[Socket.IO] Socket error:", socket.id, error);
    });
  });

  console.log("[Socket.IO] Server started successfully");
}

export function broadcastCallEvent(hostId, payload, roomId = null) {
  console.log("[Socket.IO] Broadcasting event:", payload.type, "to host:", hostId);
  
  // Attach router caps if we already have them for this room
  if (roomId) {
    const room = rooms.get(roomId);
    if (room?.routerRtpCapabilities && !payload.routerRtpCapabilities) {
      payload.routerRtpCapabilities = room.routerRtpCapabilities;
    }
  }

  let sent = 0;
  for (const peer of peers.values()) {
    if (peer.role === "user" && peer.hostId === hostId) {
      peer.socket.emit("message", payload);
      sent++;
    }
  }
  console.log("[Socket.IO] Broadcast sent to", sent, "users");
}

export function handleSocket({ socket, io }) {
  let peer = null;

  async function startRecorderForUser(roomId, room, peer) {
    const userPort = allocRecorderPort();
    const hostPort = allocRecorderPort();
    const remoteIp = process.env.RECORDER_IP || "recorder";

    sendRecorder({
      type: "START_USER",
      hostId: peer.hostId,
      userId: peer.id,
      meetingId: roomId,
      userPort,
      hostPort,
      userPreSeconds: 2,
      hostPreSeconds: 5,
      userPostSeconds: 2,
      hostPostSeconds: 5,
    });
    
    sendRecorder({
      type: "START_CLIP",
      userId: peer.id
    });

    try {
      await sendMediasoup({
        type: MS.CREATE_RECORDER,
        roomId,
        producerOwnerId: peer.id,
        remotePort: userPort,
        remoteIp
      });

      if (room.hostProducerId) {
        await sendMediasoup({
          type: MS.CREATE_RECORDER,
          roomId,
          producerOwnerId: peer.hostId,
          remotePort: hostPort,
          remoteIp
        });
      }
    } catch (err) {
      console.error("[Socket.IO] Recorder setup failed:", err?.message || err);
    }
  }

  const requirePeer = () => {
    if (!peer) throw new Error("Peer not initialized");
    return peer;
  };

  // Handle all message types
  socket.on("message", async (msg) => {
    try {
      console.log("[Socket.IO]", msg.type, "from", peer?.id || "unauth");
    } catch {
      // Ignore log errors
    }

    try {
      await handleMessage(msg);
    } catch (error) {
      console.error("[Socket.IO] Message handling error:", error);
      socket.emit("error", { message: error.message });
    }
  });

  // Also listen for specific event types directly
  const eventTypes = [
    "PING", "PONG", "auth", "AUTH", "CALL_STARTED", "call-started",
    "GET_ROUTER_CAPS", "get-router-caps", "REQUEST_HOST_PRODUCER",
    "JOIN", "CONNECT_SEND_TRANSPORT", "PRODUCE", "CONNECT_RECV_TRANSPORT",
    "CONSUME", "RESUME_CONSUMER", "CALL_STOPPED", "call-stopped",
    "USER_SPEAKING_START", "USER_SPEAKING_STOP", "HOST_MIC_STATUS"
  ];

  eventTypes.forEach(type => {
    socket.on(type, async (data) => {
      const msg = typeof data === 'object' ? { ...data, type } : { type };
      try {
        await handleMessage(msg);
      } catch (error) {
        console.error(`[Socket.IO] ${type} handling error:`, error);
        socket.emit("error", { message: error.message });
      }
    });
  });

  async function handleMessage(msg) {
    switch (msg.type) {
      /* ---------------- PING (from client) ---------------- */
      case "PING": {
        // Client is pinging us, respond with PONG
        const responsePayload = {
          type: "PONG",
        };
        
        // Echo back clientTimestamp if provided
        if (msg.clientTimestamp) {
          responsePayload.clientTimestamp = msg.clientTimestamp;
        }
        
        // Also include our timestamp
        if (msg.timestamp) {
          responsePayload.timestamp = msg.timestamp;
        }
        
        socket.emit("PONG", responsePayload);
        console.log("[Socket.IO] Received PING from", peer?.id, "- sent PONG");
        break;
      }

      /* ---------------- PONG (ping response) ---------------- */
      case "PONG": {
        if (peer && peer.lastPingTime) {
          const latency = Date.now() - peer.lastPingTime;
          peer.latency = latency;
          socket.emit("LATENCY_UPDATE", {
            type: "LATENCY_UPDATE",
            latency: latency,
          });
        }
        break;
      }

      /* ---------------- AUTH ---------------- */
      case "auth":
      case "AUTH": {
        if (peer) break; // Already authed
        try {
          const decoded = verifyJwt(msg.token);
          const role = decoded.role;
          const userId = decoded.userId;
          const hostId = decoded.hostId;
          const id = role === "host" ? hostId : userId;
          
          console.log("[Socket.IO] AUTH success:", { id, role, hostId, userId });
          
          peer = new Peer({
            id,
            socket,
            role,
            hostId
          });
          peers.set(peer.id, peer);
          
          socket.emit("authenticated", { success: true, id, role });
        } catch (e) {
          console.error("[Socket.IO] AUTH failed:", e.message);
          socket.emit("auth_error", { error: e.message });
        }
        break;
      }

      /* ---------------- CALL STARTED ---------------- */
      case "CALL_STARTED":
      case "call-started": {
        if (!peer || peer.role !== "host") break;
        
        const roomId = msg.roomId || peer.roomId || peer.hostId || "main-room";
        peer.roomId = roomId;
        const room = await ensureMediasoupRoom(roomId);
        
        if (!room.hostId) {
          room.hostId = peer.hostId;
        }
        
        broadcastCallEvent(peer.hostId, {
          type: "call-started",
          roomId,
          routerRtpCapabilities: room.routerRtpCapabilities ?? {},
        }, roomId);
        break;
      }

      /* ---------------- ROUTER CAPS REQUEST ---------------- */
      case "GET_ROUTER_CAPS":
      case "get-router-caps": {
        const roomId = msg.roomId || peer?.roomId || peer?.hostId || "main-room";
        const room = await ensureMediasoupRoom(roomId);
        
        socket.emit("ROUTER_CAPS", {
          type: "ROUTER_CAPS",
          routerRtpCapabilities: room.routerRtpCapabilities,
          hostProducerId: room.hostProducerId,
        });
        break;
      }

      /* ---------------- REQUEST HOST PRODUCER ---------------- */
      case "REQUEST_HOST_PRODUCER": {
        const roomId = msg.roomId || peer?.roomId || peer?.hostId || "main-room";
        const room = getRoom(roomId);
        
        if (room?.hostProducerId) {
          socket.emit("HOST_PRODUCER", {
            type: "HOST_PRODUCER",
            producerId: room.hostProducerId,
            routerRtpCapabilities: room.routerRtpCapabilities ?? null,
          });
        }
        break;
      }

      /* ---------------- JOIN ---------------- */
      case "JOIN": {
        const decoded = verifyJwt(msg.token);
        const role = decoded.role;
        const userId = decoded.userId;
        const hostId = decoded.hostId;
        const id = role === "host" ? hostId : userId;
        
        console.log("[Socket.IO] JOIN:", { id, role, hostId, userId });

        const roomId = msg.roomId || msg.roomID || peer?.roomId || hostId || "main-room";
        const room = await ensureMediasoupRoom(roomId);
        
        console.log("[Socket.IO] JOIN resolved room:", { id, role, roomId });

        peer = new Peer({
          id,
          socket,
          role,
          hostId
        });
        peer.roomId = roomId;
        peer.hostId = hostId;

        peers.set(peer.id, peer);
        getRoom(roomId).peers.set(peer.id, peer);

        // SEND transport via mediasoup-server
        const sendT = await sendMediasoup({
          type: MS.CREATE_TRANSPORT,
          roomId,
        });
        peer.sendTransport = { id: sendT.id };

        socket.emit("SEND_TRANSPORT_CREATED", {
          type: "SEND_TRANSPORT_CREATED",
          params: {
            id: sendT.id,
            iceParameters: sendT.iceParameters,
            iceCandidates: sendT.iceCandidates,
            dtlsParameters: sendT.dtlsParameters,
          }
        });

        // RECV transport
        const recvT = await sendMediasoup({
          type: MS.CREATE_TRANSPORT,
          roomId,
        });
        peer.recvTransport = { id: recvT.id };

        socket.emit("RECV_TRANSPORT_CREATED", {
          type: "RECV_TRANSPORT_CREATED",
          params: {
            id: recvT.id,
            iceParameters: recvT.iceParameters,
            iceCandidates: recvT.iceCandidates,
            dtlsParameters: recvT.dtlsParameters,
          }
        });

        socket.emit("TURN_CONFIG", {
          type: "TURN_CONFIG",
          iceServers: [
            {
              urls: process.env.TURN_URLS.split(","),
              username: process.env.TURN_USERNAME,
              credential: process.env.TURN_PASSWORD,
            }
          ]
        });

        // Tell newly joined user about existing host producer
        if (peer.role === "user" && room.hostProducerId) {
          socket.emit("HOST_PRODUCER", {
            type: "HOST_PRODUCER",
            producerId: room.hostProducerId,
            routerRtpCapabilities: room.routerRtpCapabilities ?? null,
          });
        }

        // Notify hosts when a user joins
        if (peer.role === "user") {
          for (const other of room.peers.values()) {
            if (other.role === "host") {
              other.socket.emit("USER_JOINED", {
                type: "USER_JOINED",
                userId: id,
              });
            }
          }
        }
        break;
      }

      /* -------- CONNECT SEND TRANSPORT -------- */
      case "CONNECT_SEND_TRANSPORT": {
        const roomId = peer?.roomId || msg.roomId || peer?.hostId || "main-room";
        console.log("[Socket.IO] CONNECT_SEND_TRANSPORT:", { roomId, id: requirePeer().id });
        
        await sendMediasoup({
          type: MS.CONNECT_TRANSPORT,
          roomId,
          transportId: requirePeer().sendTransport.id,
          dtlsParameters: msg.dtlsParameters,
        });
        break;
      }

      /* -------- CONNECT RECV TRANSPORT -------- */
      case "CONNECT_RECV_TRANSPORT": {
        const roomId = peer?.roomId || msg.roomId || peer?.hostId || "main-room";
        console.log("[Socket.IO] CONNECT_RECV_TRANSPORT:", { roomId, id: requirePeer().id });
        
        await sendMediasoup({
          type: MS.CONNECT_TRANSPORT,
          roomId,
          transportId: requirePeer().recvTransport.id,
          dtlsParameters: msg.dtlsParameters,
        });
        break;
      }

      /* ---------------- PRODUCE ---------------- */
      case "PRODUCE": {
        const roomId = peer?.roomId || msg.roomId || peer?.hostId || "main-room";
        const room = await ensureMediasoupRoom(roomId);
        
        console.log("[Socket.IO] PRODUCE:", { roomId, owner: peer.id });
        
        try {
          const res = await sendMediasoup({
            type: MS.PRODUCE,
            roomId,
            transportId: requirePeer().sendTransport.id,
            rtpParameters: msg.rtpParameters,
            ownerId: peer.id,
          });
          
          peer.producer = { id: res.producerId };
          room.producerIdToOwner.set(res.producerId, peer.id);
          
          if (peer.role === "host") {
            room.hostProducerId = res.producerId;
            
            // Notify all users about host producer
            for (const other of room.peers.values()) {
              if (other.role === "user") {
                other.socket.emit("HOST_PRODUCER", {
                  type: "HOST_PRODUCER",
                  producerId: res.producerId,
                  routerRtpCapabilities: room.routerRtpCapabilities ?? null,
                });
              }
            }
          }

          if (peer.role === "user") {
            await startRecorderForUser(roomId, room, peer);
          }

          // Notify other peers
          for (const other of room.peers.values()) {
            if (other.id === peer.id) continue;
            
            if (peer.role === "host" && other.role === "user") {
              other.socket.emit("NEW_PRODUCER", {
                type: "NEW_PRODUCER",
                producerId: peer.producer.id,
                ownerRole: "host",
              });
            }
            
            if (peer.role === "user" && other.role === "host") {
              other.socket.emit("NEW_PRODUCER", {
                type: "NEW_PRODUCER",
                producerId: peer.producer.id,
                ownerRole: "user",
                userId: peer.id,
              });
            }
          }

          socket.emit("PRODUCED", {
            type: "PRODUCED",
            producerId: res.producerId,
          });
          
        } catch (e) {
          console.error("[Socket.IO] PRODUCE failed:", e?.message || e);
          socket.emit("PRODUCE_ERROR", { 
            type: "PRODUCE_ERROR", 
            error: e?.message || "produce failed" 
          });
        }
        break;
      }

      /* ---------------- CONSUME ---------------- */
      case "CONSUME": {
        const roomId = peer?.roomId || msg.roomId || peer?.hostId || "main-room";
        const room = getRoom(roomId);
        
        // Get the owner ID from the producer ID
        const producerOwnerId = room.producerIdToOwner.get(msg.producerId);
        
        console.log("[Socket.IO] CONSUME:", { roomId, producerId: msg.producerId, producerOwnerId });
        
        if (!producerOwnerId) {
          console.error("[Socket.IO] CONSUME failed: producer owner not found for producerId:", msg.producerId);
          socket.emit("CONSUME_ERROR", {
            type: "CONSUME_ERROR",
            error: "Producer not found"
          });
          break;
        }
        
        try {
          const res = await sendMediasoup({
            type: MS.CONSUME,
            roomId,
            transportId: requirePeer().recvTransport.id,
            producerOwnerId: producerOwnerId,  // Send owner ID, not producer ID
            rtpCapabilities: msg.rtpCapabilities,
          });
          
          console.log("[Socket.IO] Mediasoup CONSUME response:", JSON.stringify(res, null, 2));
          
          // Mediasoup returns: { id, producerId, kind, rtpParameters }
          const consumerId = res.id || res.consumerId;
          const kind = res.kind || "audio"; // Get kind from response or default to audio
          
          if (!consumerId) {
            console.error("[Socket.IO] CRITICAL: Mediasoup did not return consumer ID! Response:", res);
            socket.emit("CONSUME_ERROR", {
              type: "CONSUME_ERROR",
              error: "Failed to create consumer - no ID returned"
            });
            break;
          }
          
          requirePeer().consumers.set(consumerId, { id: consumerId });
          
          console.log("[Socket.IO] CONSUME successful:", {
            consumerId: consumerId,
            producerId: msg.producerId,
            kind: kind
          });
          
          // Send both message types for compatibility
          const consumeResponse = {
            type: "CONSUMED",
            producerId: msg.producerId,
            id: consumerId,
            consumerId: consumerId, // Also include as consumerId
            kind: kind,
            rtpParameters: res.rtpParameters,
            params: {
              id: consumerId,
              consumerId: consumerId,
              producerId: msg.producerId,
              kind: kind,
              rtpParameters: res.rtpParameters,
            }
          };
          
          console.log("[Socket.IO] Sending CONSUMED response:", JSON.stringify(consumeResponse, null, 2));
          
          socket.emit("CONSUMED", consumeResponse);
          socket.emit("CONSUMER_CREATED", consumeResponse);
          
          console.log("[Socket.IO] CONSUMED successfully:", {
            consumerId: consumerId,
            producerId: msg.producerId,
            kind: kind
          });
        } catch (e) {
          console.error("[Socket.IO] CONSUME failed:", e?.message || e);
          socket.emit("CONSUME_ERROR", {
            type: "CONSUME_ERROR",
            error: e?.message || "consume failed"
          });
        }
        break;
      }

      /* ---------------- HOST MIC STATUS ---------------- */
      case "HOST_MIC_STATUS": {
        if (!peer || peer.role !== "host") break;
        
        const roomId = msg.roomId || peer.roomId || peer.hostId || "main-room";
        console.log("[Socket.IO] HOST_MIC_STATUS:", { hostId: peer.id, muted: msg.muted, roomId });
        
        // Notify all users in the room about host mic status
        const room = getRoom(roomId);
        if (room) {
          for (const [peerId, otherPeer] of room.peers) {
            if (otherPeer.role === "user") {
              otherPeer.socket.emit("HOST_MIC_STATUS", {
                type: "HOST_MIC_STATUS",
                muted: msg.muted,
              });
            }
          }
        }
        break;
      }

      /* ---------------- USER SPEAKING STATUS ---------------- */
      case "USER_SPEAKING_START": {
        if (!peer || peer.role !== "user") break;
        
        const roomId = peer.roomId || peer.hostId || "main-room";
        console.log("[Socket.IO] USER_SPEAKING_START:", { userId: peer.id, roomId });
        
        // Start a clip for this speaking burst
        sendRecorder({ type: "START_CLIP", userId: peer.id });
        
        // Notify host about user speaking
        const room = getRoom(roomId);
        if (room) {
          for (const [peerId, otherPeer] of room.peers) {
            if (otherPeer.role === "host") {
              otherPeer.socket.emit("USER_SPEAKING_STATUS", {
                type: "USER_SPEAKING_STATUS",
                userId: peer.id,
                speaking: true,
              });
            }
          }
        }
        break;
      }

      case "USER_SPEAKING_STOP": {
        if (!peer || peer.role !== "user") break;
        
        const roomId = peer.roomId || peer.hostId || "main-room";
        console.log("[Socket.IO] USER_SPEAKING_STOP:", { userId: peer.id, roomId });
        
        // Stop current clip for this speaking burst
        sendRecorder({ type: "STOP_CLIP", userId: peer.id });
        
        // Notify host about user stopped speaking
        const room = getRoom(roomId);
        if (room) {
          for (const [peerId, otherPeer] of room.peers) {
            if (otherPeer.role === "host") {
              otherPeer.socket.emit("USER_SPEAKING_STATUS", {
                type: "USER_SPEAKING_STATUS",
                userId: peer.id,
                speaking: false,
              });
            }
          }
        }
        break;
      }

      /* ---------------- CALL STOPPED ---------------- */
      case "CALL_STOPPED":
      case "call-stopped": {
        if (!peer || peer.role !== "host") break;
        
        const roomId = peer.roomId || peer.hostId || "main-room";
        console.log("[Socket.IO] CALL_STOPPED:", { roomId, hostId: peer.hostId });
        
        broadcastCallEvent(peer.hostId, {
          type: "call-stopped",
          roomId,
        }, roomId);
        
        // Cleanup room
        const room = rooms.get(roomId);
        if (room) {
          for (const [userId, userPeer] of room.peers) {
            if (userPeer.role === "user") {
              sendRecorder({ type: "STOP_CLIP", userId: userId });
              sendRecorder({ type: "STOP_USER", userId: userId });
              sendRecorder({
                type: "STOP_CLIP",
                userId: userId
              });
            }
          }
        }
        break;
      }

      default:
        console.log("[Socket.IO] Unknown message type:", msg.type);
    }
  }
}



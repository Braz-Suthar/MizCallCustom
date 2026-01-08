import { Router } from "express";
import { query } from "../../services/db.js";
import { requireAuth, requireUser } from "../../middleware/auth.js";
import { getRoom } from "../../signaling/socket-io.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// Shared avatar upload directory (same as hosts)
const uploadDir = path.join(process.cwd(), "uploads", "avatars");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "") || ".jpg";
    cb(null, `${req.userId || "user"}_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

/**
 * GET /user/active-call
 * Fetch the active call for the logged-in user
 */
router.get("/active-call", requireAuth, requireUser, async (req, res) => {
  try {
    const { userId, hostId } = req.auth;
    
    console.log("[GET /user/active-call]", { userId, hostId });
    
    // Find active call for this user's host (table is called 'rooms', not 'calls')
    const result = await query(
      `SELECT 
        id,
        started_at,
        ended_at,
        status
       FROM rooms
       WHERE host_id = $1 
         AND status = 'started'
       ORDER BY started_at DESC 
       LIMIT 1`,
      [hostId]
    );
    
    if (result.rowCount === 0) {
      console.log("[GET /user/active-call] No active call found for host:", hostId);
      return res.status(404).json({ error: "No active call found" });
    }
    
    const call = result.rows[0];
    const roomId = call.id; // In rooms table, id IS the room_id
    
    console.log("[GET /user/active-call] Call found:", {
      id: call.id,
      roomId: roomId,
      status: call.status
    });
    
    // Get live room data from Socket.IO memory (has router caps and producer IDs)
    let routerRtpCapabilities = null;
    let hostProducerId = null;
    
    try {
      const liveRoom = getRoom(roomId);
      if (liveRoom) {
        routerRtpCapabilities = liveRoom.routerRtpCapabilities;
        hostProducerId = liveRoom.hostProducerId;
        
        console.log("[GET /user/active-call] Live room data:", {
          roomId: roomId,
          hasRouterCaps: !!routerRtpCapabilities,
          hostProducerId: hostProducerId
        });
      } else {
        console.warn("[GET /user/active-call] No live room found in memory for roomId:", roomId);
      }
    } catch (err) {
      console.error("[GET /user/active-call] Error getting live room:", err);
    }
    
    res.json({
      call: {
        id: call.id,
        room_id: roomId, // Same as id for rooms table
        started_at: call.started_at,
        ended_at: call.ended_at,
        status: call.status,
        router_rtp_capabilities: routerRtpCapabilities,
        host_producer_id: hostProducerId,
      }
    });
  } catch (error) {
    console.error("[GET /user/active-call] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Upload user avatar
router.post("/avatar", requireAuth, requireUser, upload.single("avatar"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "avatar file is required" });
  }

  const avatarPath = `/uploads/avatars/${req.file.filename}`;
  await query(`UPDATE users SET avatar_url = $1 WHERE id = $2`, [avatarPath, req.userId]);

  res.json({ avatarUrl: avatarPath });
});

export default router;


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

// Call background upload directory
const backgroundsDir = path.join(process.cwd(), "uploads", "backgrounds");
if (!fs.existsSync(backgroundsDir)) fs.mkdirSync(backgroundsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "") || ".jpg";
    cb(null, `${req.userId || "user"}_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

const backgroundStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, backgroundsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "") || ".jpg";
    cb(null, `bg_${req.userId || "user"}_${Date.now()}${ext}`);
  },
});
const uploadBackground = multer({ storage: backgroundStorage });

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
  console.log("[user/avatar] stored", { userId: req.userId, avatarPath });

  res.json({ avatarUrl: avatarPath });
});

/* GET INBUILT BACKGROUND IMAGES (same for all users) */
router.get(
  "/call-background/inbuilt",
  requireAuth,
  requireUser,
  async (req, res) => {
    try {
      const backgroundsDir = path.join(process.cwd(), "public", "inbuilt_call_background_images");
      
      if (!fs.existsSync(backgroundsDir)) {
        return res.json({ backgrounds: [] });
      }
      
      const files = fs.readdirSync(backgroundsDir);
      const imageFiles = files.filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file));
      
      const backgrounds = imageFiles.map(file => ({
        id: file,
        url: `/public/inbuilt_call_background_images/${file}`,
      }));
      
      res.json({ backgrounds });
    } catch (error) {
      console.error("[User] Failed to list inbuilt backgrounds:", error);
      res.json({ backgrounds: [] });
    }
  }
);

/* GET ALL CUSTOM UPLOADED BACKGROUNDS FOR USER */
router.get(
  "/call-background/custom",
  requireAuth,
  requireUser,
  async (req, res) => {
    try {
      const result = await query(
        `SELECT id, url, filename, uploaded_at 
         FROM custom_backgrounds 
         WHERE user_id = $1 
         ORDER BY uploaded_at DESC`,
        [req.userId]
      );
      
      res.json({ backgrounds: result.rows });
    } catch (error) {
      console.error("[User] Failed to list custom backgrounds:", error);
      res.json({ backgrounds: [] });
    }
  }
);

/* GET USER'S ACTIVE BACKGROUND */
router.get(
  "/call-background",
  requireAuth,
  requireUser,
  async (req, res) => {
    const result = await query(
      `SELECT call_background_url FROM users WHERE id = $1`,
      [req.userId]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json({ backgroundUrl: result.rows[0].call_background_url || null });
  }
);

/* UPLOAD CALL BACKGROUND IMAGE FOR USER */
router.post(
  "/call-background",
  requireAuth,
  requireUser,
  uploadBackground.single("background"),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const relativePath = `/uploads/backgrounds/${req.file.filename}`;
    
    // Save to custom_backgrounds library
    await query(
      `INSERT INTO custom_backgrounds (user_id, url, filename)
       VALUES ($1, $2, $3)`,
      [req.userId, relativePath, req.file.filename]
    );
    
    // Automatically set as active background
    await query(
      `UPDATE users SET call_background_url = $1 WHERE id = $2`,
      [relativePath, req.userId]
    );
    
    console.log("[User] Custom background uploaded:", req.file.filename);
    res.json({ backgroundUrl: relativePath });
  }
);

/* SET ACTIVE BACKGROUND FOR USER */
router.post(
  "/call-background/set-active",
  requireAuth,
  requireUser,
  async (req, res) => {
    const { backgroundUrl } = req.body;
    
    if (!backgroundUrl) {
      return res.status(400).json({ error: "backgroundUrl required" });
    }
    
    // Verify the background exists (either inbuilt or in user's custom library)
    if (backgroundUrl.startsWith("/uploads/backgrounds/")) {
      // Custom background - verify it belongs to this user
      const customBg = await query(
        `SELECT id FROM custom_backgrounds WHERE url = $1 AND user_id = $2`,
        [backgroundUrl, req.userId]
      );
      if (customBg.rowCount === 0) {
        return res.status(404).json({ error: "Background not found in your library" });
      }
    } else if (backgroundUrl.startsWith("/public/inbuilt_call_background_images/")) {
      // Inbuilt background - verify file exists
      const filePath = path.join(process.cwd(), backgroundUrl);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Inbuilt background not found" });
      }
    } else {
      return res.status(400).json({ error: "Invalid background URL" });
    }
    
    // Set as active
    await query(
      `UPDATE users SET call_background_url = $1 WHERE id = $2`,
      [backgroundUrl, req.userId]
    );
    
    res.json({ backgroundUrl });
  }
);

/* CLEAR ACTIVE BACKGROUND FOR USER */
router.delete(
  "/call-background",
  requireAuth,
  requireUser,
  async (req, res) => {
    await query(
      `UPDATE users SET call_background_url = NULL WHERE id = $1`,
      [req.userId]
    );
    
    res.json({ ok: true, message: "Background cleared" });
  }
);

/* DELETE SPECIFIC BACKGROUND FROM USER'S LIBRARY */
router.delete(
  "/call-background/custom/:id",
  requireAuth,
  requireUser,
  async (req, res) => {
    const { id } = req.params;
    
    // Get the background to delete
    const bgResult = await query(
      `SELECT url FROM custom_backgrounds WHERE id = $1 AND user_id = $2`,
      [id, req.userId]
    );
    
    if (bgResult.rowCount === 0) {
      return res.status(404).json({ error: "Background not found in your library" });
    }
    
    const bgUrl = bgResult.rows[0].url;
    
    // Delete from database
    await query(
      `DELETE FROM custom_backgrounds WHERE id = $1`,
      [id]
    );
    
    // Delete the actual file
    const filePath = path.join(process.cwd(), bgUrl);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.warn("[User] Failed to delete background file:", e.message);
      }
    }
    
    // If this was the active background, clear it
    await query(
      `UPDATE users SET call_background_url = NULL WHERE id = $1 AND call_background_url = $2`,
      [req.userId, bgUrl]
    );
    
    res.json({ ok: true, message: "Background deleted from library" });
  }
);

export default router;


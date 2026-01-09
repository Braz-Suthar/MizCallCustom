import { Router } from "express";
import { v4 as uuid } from "uuid";
import { query } from "../../services/db.js";
import { requireAuth, requireHost } from "../../middleware/auth.js";
import { signRefreshToken, verifyRefreshToken } from "../../services/auth.js";
import { generateUserId } from "../../services/id.js";
import { broadcastCallEvent, ensureMediasoupRoom } from "../../signaling/socket-io.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();
const uploadDir = path.join(process.cwd(), "uploads", "avatars");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "") || ".jpg";
    cb(null, `${req.hostId || "host"}_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

/* HOST PROFILE - UPDATE NAME/EMAIL */
router.patch("/profile", requireAuth, requireHost, async (req, res) => {
  const { name, email } = req.body;
  const displayName = (name || "").trim();
  const emailValue = (email || "").trim();

  if (!displayName && !emailValue) {
    return res.status(400).json({ error: "name or email required" });
  }

  if (!emailValue) {
    return res.status(400).json({ error: "email is required" });
  }

  await query(
    `UPDATE hosts SET display_name = $1, name = $2 WHERE id = $3`,
    [displayName || emailValue, emailValue, req.hostId]
  );

  res.json({ name: displayName || emailValue, email: emailValue });
});

/* HOST SECURITY SETTINGS */
router.patch("/security", requireAuth, requireHost, async (req, res) => {
  const { twoFactorEnabled, allowMultipleSessions, refreshToken } = req.body;
  if (twoFactorEnabled === undefined && allowMultipleSessions === undefined) {
    return res.status(400).json({ error: "twoFactorEnabled or allowMultipleSessions is required" });
  }

  const updates = [];
  const values = [];
  let idx = 1;

  if (twoFactorEnabled !== undefined) {
    updates.push(`two_factor_enabled = $${idx++}`);
    values.push(!!twoFactorEnabled);
  }
  if (allowMultipleSessions !== undefined) {
    updates.push(`enforce_single_session = $${idx++}`);
    values.push(!allowMultipleSessions);
    if (allowMultipleSessions) {
      updates.push(`active_session_refresh_token = NULL`);
      updates.push(`active_session_expires_at = NULL`);
    } else {
      let tokenToStore = refreshToken;
      let payload;
      if (tokenToStore) {
        try {
          payload = verifyRefreshToken(tokenToStore);
          if (payload.role !== "host" || payload.hostId !== req.hostId) {
            tokenToStore = null;
          }
        } catch {
          tokenToStore = null;
        }
      }
      // If client did not send or sent an invalid refresh token, mint a new one for this host/session
      if (!tokenToStore) {
        tokenToStore = signRefreshToken({ role: "host", hostId: req.hostId });
        payload = verifyRefreshToken(tokenToStore);
      }
      const expiresAt = payload?.exp ? new Date(payload.exp * 1000) : null;
      updates.push(`active_session_refresh_token = $${idx++}`);
      values.push(tokenToStore);
      updates.push(`active_session_expires_at = $${idx++}`);
      values.push(expiresAt);
      req.activeSessionRefreshToken = tokenToStore; // surface back in response
    }
  }

  if (!updates.length) {
    return res.status(400).json({ error: "no updates" });
  }

  values.push(req.hostId);
  await query(`UPDATE hosts SET ${updates.join(", ")} WHERE id = $${idx}`, values);
  res.json({
    twoFactorEnabled: twoFactorEnabled !== undefined ? !!twoFactorEnabled : undefined,
    allowMultipleSessions: allowMultipleSessions !== undefined ? !!allowMultipleSessions : undefined,
    refreshToken: req.activeSessionRefreshToken,
  });
});

/* HOST SESSION LIST */
router.get("/sessions", requireAuth, requireHost, async (req, res) => {
  // Backfill labels for any legacy/unknown entries using stored user agent
  await query(
    `UPDATE host_sessions
        SET device_label = COALESCE(user_agent, 'Unknown device')
      WHERE host_id = $1 AND (device_label IS NULL OR device_label = 'Unknown device')`,
    [req.hostId]
  );
  const result = await query(
    `SELECT id,
            COALESCE(device_label, user_agent, 'Unknown device') AS deviceLabel,
            user_agent AS userAgent,
            created_at AS createdAt,
            last_seen_at AS lastSeenAt
       FROM host_sessions WHERE host_id = $1 ORDER BY last_seen_at DESC NULLS LAST, created_at DESC`,
    [req.hostId]
  );
  res.json({ sessions: result.rows });
});

/* HOST SESSION REVOKE */
router.post("/sessions/revoke", requireAuth, requireHost, async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: "sessionId required" });
  await query("DELETE FROM host_sessions WHERE id = $1 AND host_id = $2", [sessionId, req.hostId]);
  res.json({ ok: true, sessionId });
});

/* DASHBOARD STATS */
router.get("/dashboard", requireAuth, requireHost, async (req, res) => {
  try {
    // Get total users count
    const totalUsersResult = await query(
      `SELECT COUNT(*) as total FROM users WHERE host_id = $1`,
      [req.hostId]
    );

    // Get active users count (enabled users)
    const activeUsersResult = await query(
      `SELECT COUNT(*) as total FROM users WHERE host_id = $1 AND enabled = true`,
      [req.hostId]
    );

    // Get total calls count
    const totalCallsResult = await query(
      `SELECT COUNT(*) as total FROM rooms WHERE host_id = $1`,
      [req.hostId]
    );

    // Get active calls count
    const activeCallsResult = await query(
      `SELECT COUNT(*) as total FROM rooms WHERE host_id = $1 AND status = 'started'`,
      [req.hostId]
    );

    // Get recent activity (last 5 events)
    const recentActivityResult = await query(
      `(
        SELECT 
          'call' as type,
          id::text,
          status,
          started_at as created_at,
          NULL as username
        FROM rooms
        WHERE host_id = $1
      )
      UNION ALL
      (
        SELECT 
          'user' as type,
          id::text,
          CASE WHEN enabled THEN 'active' ELSE 'disabled' END as status,
          created_at,
          username
        FROM users
        WHERE host_id = $1
      )
      ORDER BY created_at DESC
      LIMIT 5`,
      [req.hostId]
    );

    res.json({
      stats: {
        totalUsers: parseInt(totalUsersResult.rows[0].total),
        activeUsers: parseInt(activeUsersResult.rows[0].total),
        totalCalls: parseInt(totalCallsResult.rows[0].total),
        activeCalls: parseInt(activeCallsResult.rows[0].total),
      },
      recentActivity: recentActivityResult.rows.map(row => ({
        type: row.type,
        id: row.id,
        status: row.status,
        createdAt: row.created_at,
        username: row.username,
      })),
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

/* CREATE USER */
router.post("/users", requireAuth, requireHost, async (req, res) => {
  const id = await generateUserId();
  const username = req.body.username;
  const password = req.body.password || Math.random().toString(36).slice(2, 10);

  if (!username)
    return res.status(400).json({ error: "username required" });

  await query(
    `INSERT INTO users (id, host_id, username, password)
     VALUES ($1, $2, $3, $4)`,
    [id, req.hostId, username, password]
  );

  res.json({ userId: id, password });
});

/* ENABLE / DISABLE USER */
router.patch(
  "/users/:userId",
  requireAuth,
  requireHost,
  async (req, res) => {
    const { enabled, password } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;

    if (enabled !== undefined) {
      updates.push(`enabled = $${idx++}`);
      values.push(enabled);
    }

    if (password) {
      updates.push(`password = $${idx++}`);
      values.push(password);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "no fields to update" });
    }

    values.push(req.params.userId, req.hostId);

    await query(
      `UPDATE users 
       SET ${updates.join(", ")} 
       WHERE id = $${idx++} AND host_id = $${idx}`,
      values
    );

    res.sendStatus(204);
  }
);

/* GET USER DETAILS (with password) */
router.get(
  "/users/:userId",
  requireAuth,
  requireHost,
  async (req, res) => {
    const { userId } = req.params;
    const result = await query(
      `SELECT id, username, password, enabled, device_info, avatar_url
       FROM users
       WHERE id = $1 AND host_id = $2`,
      [userId, req.hostId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user: result.rows[0] });
  }
);

/* DELETE USER */
router.delete(
  "/users/:userId",
  requireAuth,
  requireHost,
  async (req, res) => {
    await query(
      `DELETE FROM users 
       WHERE id = $1 AND host_id = $2`,
      [req.params.userId, req.hostId]
    );
    res.sendStatus(204);
  }
);

/* LIST USERS FOR HOST */
router.get("/users", requireAuth, requireHost, async (req, res) => {
  const result = await query(
    `SELECT id, username, enabled, last_speaking, avatar_url
     FROM users
     WHERE host_id = $1
     ORDER BY username`,
    [req.hostId]
  );
  console.log("[host/users] returning", result.rows.length, "users");
  res.json({ users: result.rows });
});

/* START CALL (LOGICAL ONLY FOR NOW) */
router.post("/calls/start", requireAuth, requireHost, async (req, res) => {
  const roomId = uuid();

  await query(
    `INSERT INTO rooms (id, host_id, status, started_at)
     VALUES ($1, $2, 'started', NOW())`,
    [roomId, req.hostId]
  );

  const room = await ensureMediasoupRoom(roomId);
  if (room && !room.hostId) {
    room.hostId = req.hostId;
  }

  res.json({ roomId, routerRtpCapabilities: room?.routerRtpCapabilities ?? {} });

  broadcastCallEvent(
    req.hostId,
    {
      type: "call-started",
      roomId,
      hostId: req.hostId,
      routerRtpCapabilities: room?.routerRtpCapabilities ?? {},
    },
    roomId
  );
});

/* LIST CALLS FOR HOST */
router.get("/calls", requireAuth, requireHost, async (req, res) => {
  const result = await query(
    `SELECT id, status, started_at, ended_at
     FROM rooms
     WHERE host_id = $1
     ORDER BY started_at DESC`,
    [req.hostId]
  );
  res.json({ calls: result.rows });
});

/* GET ACTIVE CALL PARTICIPANTS */
router.get("/calls/:roomId/participants", requireAuth, requireHost, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    // Verify the call belongs to this host
    const callResult = await query(
      `SELECT id FROM rooms WHERE id = $1 AND host_id = $2`,
      [roomId, req.hostId]
    );
    
    if (callResult.rows.length === 0) {
      return res.status(404).json({ error: "Call not found" });
    }

    // Get the room from signaling server
    const { getRoom, peers } = await import("../../signaling/socket-io.js");
    
    const room = getRoom(roomId);
    const participants = [];
    
    if (room?.peers) {
      // Iterate through all peers in the room
      for (const [peerId, peer] of room.peers) {
        // Skip the host
        if (peer.role === "host") continue;
        
        // Get user details from database
        const userResult = await query(
          `SELECT id, username FROM users WHERE id = $1 AND host_id = $2`,
          [peerId, req.hostId]
        );
        
        if (userResult.rows.length > 0) {
          const user = userResult.rows[0];
          participants.push({
            id: user.id,
            username: user.username,
            userId: user.id,
            speaking: false, // Will be updated via WebSocket in real-time
            connected: true,
          });
        }
      }
    }
    
    res.json({ participants });
  } catch (error) {
    console.error("Error fetching participants:", error);
    res.status(500).json({ error: "Failed to fetch participants" });
  }
});

/* END CALL */
router.patch("/calls/:id/end", requireAuth, requireHost, async (req, res) => {
  const { id } = req.params;
  await query(
    `UPDATE rooms
     SET status = 'ended',
         ended_at = NOW()
     WHERE id = $1 AND host_id = $2`,
    [id, req.hostId]
  );

  broadcastCallEvent(req.hostId, {
    type: "call-stopped",
    roomId: id,
    hostId: req.hostId
  });

  res.json({ ok: true });
});

/* UPLOAD HOST AVATAR */
router.post(
  "/avatar",
  requireAuth,
  requireHost,
  upload.single("avatar"),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const relativePath = `/uploads/avatars/${req.file.filename}`;
    await query(
      `UPDATE hosts SET avatar_url = $1 WHERE id = $2`,
      [relativePath, req.hostId]
    );
    res.json({ avatarUrl: relativePath });
  }
);

export default router;

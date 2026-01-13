import { Router } from "express";
import { v4 as uuid } from "uuid";
import { query } from "../../services/db.js";
import { requireAuth, requireHost } from "../../middleware/auth.js";
import { signRefreshToken, verifyRefreshToken } from "../../services/auth.js";
import { generateUserId } from "../../services/id.js";
import { broadcastCallEvent, ensureMediasoupRoom, peers } from "../../signaling/socket-io.js";
import { notifyHostUsers } from "../../services/firebase.js";
import { logInfo, logError, logWarn } from "../../services/logger.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();
const uploadDir = path.join(process.cwd(), "uploads", "avatars");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Call background upload directory
const backgroundsDir = path.join(process.cwd(), "uploads", "backgrounds");
if (!fs.existsSync(backgroundsDir)) fs.mkdirSync(backgroundsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "") || ".jpg";
    cb(null, `${req.hostId || "host"}_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

const backgroundStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, backgroundsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "") || ".jpg";
    cb(null, `bg_${req.hostId || "host"}_${Date.now()}${ext}`);
  },
});
const uploadBackground = multer({ storage: backgroundStorage });

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
  const { twoFactorEnabled, allowMultipleSessions, enforceUserSingleSession, refreshToken } = req.body;
  if (twoFactorEnabled === undefined && allowMultipleSessions === undefined && enforceUserSingleSession === undefined) {
    return res.status(400).json({ error: "At least one setting is required" });
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
      // Enforce single session: keep current session, drop others
      const keepSessionId = req.sessionId || null;
      if (keepSessionId) {
        await query("DELETE FROM host_sessions WHERE host_id = $1 AND id <> $2", [req.hostId, keepSessionId]);
      } else {
        await query("DELETE FROM host_sessions WHERE host_id = $1", [req.hostId]);
      }
    }
  }
  if (enforceUserSingleSession !== undefined) {
    updates.push(`enforce_user_single_session = $${idx++}`);
    values.push(!!enforceUserSingleSession);
  }

  if (!updates.length) {
    return res.status(400).json({ error: "no updates" });
  }

  values.push(req.hostId);
  await query(`UPDATE hosts SET ${updates.join(", ")} WHERE id = $${idx}`, values);
  res.json({
    twoFactorEnabled: twoFactorEnabled !== undefined ? !!twoFactorEnabled : undefined,
    allowMultipleSessions: allowMultipleSessions !== undefined ? !!allowMultipleSessions : undefined,
    enforceUserSingleSession: enforceUserSingleSession !== undefined ? !!enforceUserSingleSession : undefined,
    refreshToken: req.activeSessionRefreshToken,
  });
});

/* GET TWO-FACTOR SETTINGS */
router.get("/two-factor-settings", requireAuth, requireHost, async (req, res) => {
  const result = await query(
    `SELECT email_otp_enabled, mobile_otp_enabled, phone_number, phone_verified
     FROM hosts
     WHERE id = $1`,
    [req.hostId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Host not found" });
  }

  const host = result.rows[0];
  res.json({
    emailOtpEnabled: host.email_otp_enabled || false,
    mobileOtpEnabled: host.mobile_otp_enabled || false,
    phoneNumber: host.phone_verified ? host.phone_number : null,
  });
});

/* UPDATE EMAIL OTP SETTING */
router.patch("/two-factor-settings/email", requireAuth, requireHost, async (req, res) => {
  const { enabled } = req.body;
  
  if (enabled === undefined) {
    return res.status(400).json({ error: "enabled field required" });
  }

  await query(
    `UPDATE hosts 
     SET email_otp_enabled = $1,
         two_factor_enabled = (email_otp_enabled OR mobile_otp_enabled OR $1)
     WHERE id = $2`,
    [!!enabled, req.hostId]
  );

  res.json({ emailOtpEnabled: !!enabled });
});

/* UPDATE MOBILE OTP SETTING */
router.patch("/two-factor-settings/mobile", requireAuth, requireHost, async (req, res) => {
  const { enabled } = req.body;
  
  if (enabled === undefined) {
    return res.status(400).json({ error: "enabled field required" });
  }

  // Check if phone is verified
  const hostResult = await query(
    `SELECT phone_verified FROM hosts WHERE id = $1`,
    [req.hostId]
  );

  if (hostResult.rows.length === 0) {
    return res.status(404).json({ error: "Host not found" });
  }

  if (enabled && !hostResult.rows[0].phone_verified) {
    return res.status(400).json({ error: "Phone number not verified. Please add and verify a phone number first." });
  }

  await query(
    `UPDATE hosts 
     SET mobile_otp_enabled = $1,
         two_factor_enabled = (email_otp_enabled OR $1)
     WHERE id = $2`,
    [!!enabled, req.hostId]
  );

  res.json({ mobileOtpEnabled: !!enabled });
});

/* SEND OTP TO PHONE */
router.post("/two-factor-settings/mobile/send-otp", requireAuth, requireHost, async (req, res) => {
  const { phoneNumber } = req.body;
  
  if (!phoneNumber) {
    return res.status(400).json({ error: "phoneNumber required" });
  }

  // Generate a 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Store OTP in database (you might want to create a table for this)
  await query(
    `INSERT INTO otp_verifications (host_id, phone_number, otp, expires_at, verified)
     VALUES ($1, $2, $3, $4, false)
     ON CONFLICT (host_id, phone_number) 
     DO UPDATE SET otp = $3, expires_at = $4, verified = false`,
    [req.hostId, phoneNumber, otp, expiresAt]
  );

  // TODO: Send OTP via SMS service (Twilio, AWS SNS, etc.)
  logInfo("2FA OTP generated", "host", { phoneNumber: phoneNumber.slice(-4) }); // Only log last 4 digits for privacy
  
  // For development, just return success
  // In production, integrate with SMS service
  res.json({ 
    success: true, 
    message: "OTP sent successfully",
    // Remove this in production:
    dev_otp: process.env.NODE_ENV === "development" ? otp : undefined
  });
});

/* VERIFY PHONE AND ENABLE MOBILE OTP */
router.post("/two-factor-settings/mobile/verify", requireAuth, requireHost, async (req, res) => {
  const { phoneNumber, otp } = req.body;
  
  if (!phoneNumber || !otp) {
    return res.status(400).json({ error: "phoneNumber and otp required" });
  }

  // Check OTP
  const otpResult = await query(
    `SELECT otp, expires_at FROM otp_verifications
     WHERE host_id = $1 AND phone_number = $2 AND verified = false
     ORDER BY expires_at DESC
     LIMIT 1`,
    [req.hostId, phoneNumber]
  );

  if (otpResult.rows.length === 0) {
    return res.status(400).json({ error: "No OTP found. Please request a new one." });
  }

  const otpRecord = otpResult.rows[0];
  
  if (new Date() > new Date(otpRecord.expires_at)) {
    return res.status(400).json({ error: "OTP expired. Please request a new one." });
  }

  if (otpRecord.otp !== otp) {
    return res.status(400).json({ error: "Invalid OTP" });
  }

  // Mark OTP as verified
  await query(
    `UPDATE otp_verifications 
     SET verified = true 
     WHERE host_id = $1 AND phone_number = $2`,
    [req.hostId, phoneNumber]
  );

  // Update host with verified phone and enable mobile OTP
  await query(
    `UPDATE hosts 
     SET phone_number = $1, 
         phone_verified = true,
         mobile_otp_enabled = true,
         two_factor_enabled = true
     WHERE id = $2`,
    [phoneNumber, req.hostId]
  );

  res.json({ 
    success: true, 
    message: "Phone verified and mobile OTP enabled",
    mobileOtpEnabled: true
  });
});

/* CHANGE PHONE NUMBER */
router.post("/two-factor-settings/mobile/change", requireAuth, requireHost, async (req, res) => {
  const { currentOtp, newPhoneNumber, newOtp } = req.body;
  
  if (!currentOtp || !newPhoneNumber || !newOtp) {
    return res.status(400).json({ error: "currentOtp, newPhoneNumber, and newOtp required" });
  }

  // Get current phone number
  const hostResult = await query(
    `SELECT phone_number FROM hosts WHERE id = $1 AND phone_verified = true`,
    [req.hostId]
  );

  if (hostResult.rows.length === 0) {
    return res.status(404).json({ error: "No verified phone number found" });
  }

  const currentPhone = hostResult.rows[0].phone_number;

  // Verify current phone OTP
  const currentOtpResult = await query(
    `SELECT otp, expires_at FROM otp_verifications
     WHERE host_id = $1 AND phone_number = $2 AND verified = false
     ORDER BY expires_at DESC
     LIMIT 1`,
    [req.hostId, currentPhone]
  );

  if (currentOtpResult.rows.length === 0) {
    return res.status(400).json({ error: "No OTP found for current number" });
  }

  if (new Date() > new Date(currentOtpResult.rows[0].expires_at)) {
    return res.status(400).json({ error: "OTP for current number expired" });
  }

  if (currentOtpResult.rows[0].otp !== currentOtp) {
    return res.status(400).json({ error: "Invalid OTP for current number" });
  }

  // Verify new phone OTP
  const newOtpResult = await query(
    `SELECT otp, expires_at FROM otp_verifications
     WHERE host_id = $1 AND phone_number = $2 AND verified = false
     ORDER BY expires_at DESC
     LIMIT 1`,
    [req.hostId, newPhoneNumber]
  );

  if (newOtpResult.rows.length === 0) {
    return res.status(400).json({ error: "No OTP found for new number" });
  }

  if (new Date() > new Date(newOtpResult.rows[0].expires_at)) {
    return res.status(400).json({ error: "OTP for new number expired" });
  }

  if (newOtpResult.rows[0].otp !== newOtp) {
    return res.status(400).json({ error: "Invalid OTP for new number" });
  }

  // Mark both OTPs as verified
  await query(
    `UPDATE otp_verifications 
     SET verified = true 
     WHERE host_id = $1 AND phone_number IN ($2, $3)`,
    [req.hostId, currentPhone, newPhoneNumber]
  );

  // Update phone number
  await query(
    `UPDATE hosts 
     SET phone_number = $1 
     WHERE id = $2`,
    [newPhoneNumber, req.hostId]
  );

  res.json({ 
    success: true, 
    message: "Phone number changed successfully",
    phoneNumber: newPhoneNumber
  });
});

/* HOST SESSION LIST */
router.get("/sessions", requireAuth, requireHost, async (req, res) => {
  const result = await query(
    `SELECT id,
            COALESCE(device_label, user_agent, 'Unknown device') AS deviceLabel,
            device_name AS deviceName,
            model_name AS modelName,
            platform,
            os_name AS osName,
            os_version AS osVersion,
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
  const enforceSingleDevice = req.body.enforceSingleDevice;

  if (!username)
    return res.status(400).json({ error: "username required" });

  // enforceSingleDevice can be: null (inherit from host), true (force single device), false (allow multiple)
  const enforceSingleDeviceValue = enforceSingleDevice === null || enforceSingleDevice === undefined 
    ? null 
    : !!enforceSingleDevice;

  await query(
    `INSERT INTO users (id, host_id, username, password, enforce_single_device)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, req.hostId, username, password, enforceSingleDeviceValue]
  );

  res.json({ userId: id, password, enforceSingleDevice: enforceSingleDeviceValue });
});

/* ENABLE / DISABLE USER */
router.patch(
  "/users/:userId",
  requireAuth,
  requireHost,
  async (req, res) => {
    const { enabled, password, enforceSingleDevice } = req.body;
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

    if (enforceSingleDevice !== undefined) {
      updates.push(`enforce_single_device = $${idx++}`);
      // Allow null (inherit), true (enforce), or false (allow multiple)
      values.push(enforceSingleDevice === null ? null : !!enforceSingleDevice);
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
      `SELECT id, username, password, enabled, device_info, avatar_url, enforce_single_device
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
    `SELECT id, username, enabled, last_speaking, avatar_url, enforce_single_device
     FROM users
     WHERE host_id = $1
     ORDER BY username`,
    [req.hostId]
  );
  // Removed verbose user list log
  res.json({ users: result.rows });
});

/* GET USER SESSIONS AND PENDING REQUESTS */
router.get("/users/:userId/sessions", requireAuth, requireHost, async (req, res) => {
  const { userId } = req.params;
  
  // Verify user belongs to this host
  const userCheck = await query(
    `SELECT id FROM users WHERE id = $1 AND host_id = $2`,
    [userId, req.hostId]
  );
  
  if (userCheck.rowCount === 0) {
    return res.status(404).json({ error: "User not found" });
  }

  // Get active sessions
  const sessionsResult = await query(
    `SELECT id, device_label, device_name, model_name, platform, os_name, os_version, 
            created_at, last_seen_at
     FROM user_sessions
     WHERE user_id = $1 AND revoked_at IS NULL
     ORDER BY last_seen_at DESC NULLS LAST, created_at DESC`,
    [userId]
  );

  // Get pending requests
  const requestsResult = await query(
    `SELECT id, device_label, device_name, model_name, platform, os_name, os_version,
            requested_at
     FROM user_session_requests
     WHERE user_id = $1 AND status = 'pending'
     ORDER BY requested_at DESC`,
    [userId]
  );

  res.json({
    sessions: sessionsResult.rows,
    pendingRequests: requestsResult.rows,
  });
});

/* APPROVE USER SESSION REQUEST */
router.post("/users/:userId/sessions/approve", requireAuth, requireHost, async (req, res) => {
  const { userId } = req.params;
  const { requestId } = req.body;
  
  if (!requestId) {
    return res.status(400).json({ error: "requestId required" });
  }

  // Verify user belongs to this host
  const userCheck = await query(
    `SELECT id FROM users WHERE id = $1 AND host_id = $2`,
    [userId, req.hostId]
  );
  
  if (userCheck.rowCount === 0) {
    return res.status(404).json({ error: "User not found" });
  }

  // Get the request
  const requestResult = await query(
    `SELECT id, user_id, host_id, device_label, device_name, model_name, platform, 
            os_name, os_version, user_agent
     FROM user_session_requests
     WHERE id = $1 AND user_id = $2 AND status = 'pending'`,
    [requestId, userId]
  );

  if (requestResult.rowCount === 0) {
    return res.status(404).json({ error: "Request not found or already processed" });
  }

  const request = requestResult.rows[0];

  // Revoke all existing sessions for this user
  await query(
    `UPDATE user_sessions 
     SET revoked_at = NOW() 
     WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );

  // Notify user via Socket.IO that their session was revoked
  const peer = peers.get(userId);
  if (peer?.socket) {
    logInfo("User session revoked - new device approved", "host", { userId, hostId: req.hostId });
    peer.socket.emit("SESSION_REVOKED", {
      type: "SESSION_REVOKED",
      reason: "new_device_approved",
      message: "You have been logged out because a new device was approved by the host.",
    });
    // Disconnect their socket
    setTimeout(() => {
      peer.socket?.disconnect?.(true);
    }, 1000);
  }

  // Mark request as approved
  await query(
    `UPDATE user_session_requests 
     SET status = 'approved', approved_at = NOW(), approved_by = $1 
     WHERE id = $2`,
    [req.hostId, requestId]
  );

  // Reject any other pending requests for this user
  await query(
    `UPDATE user_session_requests 
     SET status = 'rejected', rejected_at = NOW() 
     WHERE user_id = $1 AND status = 'pending' AND id != $2`,
    [userId, requestId]
  );

  res.json({ 
    ok: true, 
    message: "Session request approved. Old sessions have been revoked.",
    requestId 
  });
});

/* REJECT USER SESSION REQUEST */
router.post("/users/:userId/sessions/reject", requireAuth, requireHost, async (req, res) => {
  const { userId } = req.params;
  const { requestId } = req.body;
  
  if (!requestId) {
    return res.status(400).json({ error: "requestId required" });
  }

  // Verify user belongs to this host
  const userCheck = await query(
    `SELECT id FROM users WHERE id = $1 AND host_id = $2`,
    [userId, req.hostId]
  );
  
  if (userCheck.rowCount === 0) {
    return res.status(404).json({ error: "User not found" });
  }

  // Mark request as rejected
  const result = await query(
    `UPDATE user_session_requests 
     SET status = 'rejected', rejected_at = NOW() 
     WHERE id = $1 AND user_id = $2 AND status = 'pending'
     RETURNING id`,
    [requestId, userId]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: "Request not found or already processed" });
  }

  res.json({ ok: true, message: "Session request rejected.", requestId });
});

/* REVOKE USER SESSION */
router.post("/users/:userId/sessions/revoke", requireAuth, requireHost, async (req, res) => {
  const { userId } = req.params;
  const { sessionId } = req.body;
  
  if (!sessionId) {
    return res.status(400).json({ error: "sessionId required" });
  }

  // Verify user belongs to this host
  const userCheck = await query(
    `SELECT id FROM users WHERE id = $1 AND host_id = $2`,
    [userId, req.hostId]
  );
  
  if (userCheck.rowCount === 0) {
    return res.status(404).json({ error: "User not found" });
  }

  // Revoke the session
  const result = await query(
    `UPDATE user_sessions 
     SET revoked_at = NOW() 
     WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL
     RETURNING id`,
    [sessionId, userId]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: "Session not found or already revoked" });
  }

  // Notify user via Socket.IO that their session was revoked by host
  const peer = peers.get(userId);
  if (peer?.socket) {
    logInfo("User session revoked by host", "host", { userId, hostId: req.hostId });
    peer.socket.emit("SESSION_REVOKED", {
      type: "SESSION_REVOKED",
      reason: "revoked_by_host",
      message: "You have been logged out by the host.",
    });
    // Disconnect their socket
    setTimeout(() => {
      peer.socket?.disconnect?.(true);
    }, 1000);
  }

  res.json({ ok: true, message: "Session revoked.", sessionId });
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

  // Broadcast to connected clients via Socket.IO
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

  // Send push notifications to all users (async, don't wait)
  notifyHostUsers(req.hostId, {
    title: "📞 New Call Started",
    body: "Your host has started a new call. Tap to join.",
    data: {
      type: "call_started",
      roomId,
      hostId: req.hostId,
    },
  }).then((result) => {
    logInfo("Call started - notifications sent", "host", { 
      hostId: req.hostId, 
      roomId,
      successCount: result.successCount,
      failureCount: result.failureCount
    });
    
    // Log the notification
    query(
      `INSERT INTO notifications (sender_id, recipient_type, title, body, data, notification_type, success_count, failure_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        req.hostId,
        "all_users",
        "📞 New Call Started",
        "Your host has started a new call. Tap to join.",
        JSON.stringify({ type: "call_started", roomId, hostId: req.hostId }),
        "call_started",
        result.successCount || 0,
        result.failureCount || 0,
      ]
    ).catch((err) => logError("Failed to log notification", "host", { error: err.message }));
  }).catch((err) => {
    logError("Failed to send call notifications", "host", { error: err.message, roomId });
  });
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
    logError("Failed to fetch call participants", "host", { error: error.message, roomId: req.params.roomId });
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

/* GET INBUILT BACKGROUND IMAGES */
router.get(
  "/call-background/inbuilt",
  requireAuth,
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
      console.error("[Host] Failed to list inbuilt backgrounds:", error);
      res.json({ backgrounds: [] });
    }
  }
);

/* GET ALL CUSTOM UPLOADED BACKGROUNDS FOR HOST */
router.get(
  "/call-background/custom",
  requireAuth,
  requireHost,
  async (req, res) => {
    try {
      const result = await query(
        `SELECT id, url, filename, uploaded_at 
         FROM custom_backgrounds 
         WHERE host_id = $1 
         ORDER BY uploaded_at DESC`,
        [req.hostId]
      );
      
      res.json({ backgrounds: result.rows });
    } catch (error) {
      logError("Failed to list custom backgrounds", "host", { error: error.message, hostId: req.hostId });
      res.json({ backgrounds: [] });
    }
  }
);

/* UPLOAD CALL BACKGROUND IMAGE (adds to library, doesn't set as active) */
router.post(
  "/call-background",
  requireAuth,
  requireHost,
  uploadBackground.single("background"),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const relativePath = `/uploads/backgrounds/${req.file.filename}`;
    
    // Save to custom_backgrounds library
    await query(
      `INSERT INTO custom_backgrounds (host_id, url, filename)
       VALUES ($1, $2, $3)`,
      [req.hostId, relativePath, req.file.filename]
    );
    
    // Automatically set as active background
    await query(
      `UPDATE hosts SET call_background_url = $1 WHERE id = $2`,
      [relativePath, req.hostId]
    );
    
    logInfo("Custom background uploaded", "host", { hostId: req.hostId, filename: req.file.filename });
    res.json({ backgroundUrl: relativePath });
  }
);

/* SET ACTIVE BACKGROUND (from library or inbuilt) */
router.post(
  "/call-background/set-active",
  requireAuth,
  requireHost,
  async (req, res) => {
    const { backgroundUrl } = req.body;
    
    if (!backgroundUrl) {
      return res.status(400).json({ error: "backgroundUrl required" });
    }
    
    // Verify the background exists (either inbuilt or in custom library)
    if (backgroundUrl.startsWith("/uploads/backgrounds/")) {
      // Custom background - verify it belongs to this host
      const customBg = await query(
        `SELECT id FROM custom_backgrounds WHERE url = $1 AND host_id = $2`,
        [backgroundUrl, req.hostId]
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
      `UPDATE hosts SET call_background_url = $1 WHERE id = $2`,
      [backgroundUrl, req.hostId]
    );
    
    res.json({ backgroundUrl });
  }
);

/* GET INBUILT BACKGROUND IMAGES */
router.get(
  "/call-background/inbuilt",
  requireAuth,
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
      console.error("[Host] Failed to list inbuilt backgrounds:", error);
      res.json({ backgrounds: [] });
    }
  }
);

/* GET HOST'S ACTIVE BACKGROUND (host only) */
router.get(
  "/call-background",
  requireAuth,
  requireHost,
  async (req, res) => {
    const result = await query(
      `SELECT call_background_url FROM hosts WHERE id = $1`,
      [req.hostId]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Host not found" });
    }
    
    res.json({ backgroundUrl: result.rows[0].call_background_url || null });
  }
);

/* SET INBUILT BACKGROUND (deprecated - use set-active instead) */
router.post(
  "/call-background/select",
  requireAuth,
  requireHost,
  async (req, res) => {
    const { backgroundId } = req.body;
    
    if (!backgroundId) {
      return res.status(400).json({ error: "backgroundId required" });
    }
    
    // Verify the inbuilt background exists
    const backgroundPath = path.join(process.cwd(), "public", "inbuilt_call_background_images", backgroundId);
    if (!fs.existsSync(backgroundPath)) {
      return res.status(404).json({ error: "Background image not found" });
    }
    
    const backgroundUrl = `/public/inbuilt_call_background_images/${backgroundId}`;
    
    // Don't delete old custom backgrounds - keep them in library
    // Just set the new one as active
    await query(
      `UPDATE hosts SET call_background_url = $1 WHERE id = $2`,
      [backgroundUrl, req.hostId]
    );
    
    res.json({ backgroundUrl });
  }
);

/* CLEAR ACTIVE BACKGROUND (don't delete files, just clear active) */
router.delete(
  "/call-background",
  requireAuth,
  requireHost,
  async (req, res) => {
    // Just clear the active background, keep all files in library
    await query(
      `UPDATE hosts SET call_background_url = NULL WHERE id = $1`,
      [req.hostId]
    );
    
    res.json({ ok: true, message: "Background cleared" });
  }
);

/* DELETE SPECIFIC BACKGROUND FROM LIBRARY */
router.delete(
  "/call-background/custom/:id",
  requireAuth,
  requireHost,
  async (req, res) => {
    const { id } = req.params;
    
    // Get the background to delete
    const bgResult = await query(
      `SELECT url FROM custom_backgrounds WHERE id = $1 AND host_id = $2`,
      [id, req.hostId]
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
        logInfo("Background file deleted", "host", { hostId: req.hostId, filename: bgUrl });
      } catch (e) {
        logWarn("Failed to delete background file", "host", { error: e.message });
      }
    }
    
    // If this was the active background, clear it
    await query(
      `UPDATE hosts SET call_background_url = NULL WHERE id = $1 AND call_background_url = $2`,
      [req.hostId, bgUrl]
    );
    
    res.json({ ok: true, message: "Background deleted from library" });
  }
);

export default router;

import { Router } from "express";
import { query } from "../../services/db.js";
import { signToken, signRefreshToken, verifyRefreshToken, generateJti } from "../../services/auth.js";
import { generateHostId } from "../../services/id.js";
import nodemailer from "nodemailer";
import { setOtp, verifyOtp } from "../../services/otpStore.js";
import { peers } from "../../signaling/socket-io.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { requireAuth, requireHost } from "../../middleware/auth.js";

const router = Router();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "mizcallofficial@gmail.com",
    pass: process.env.EMAIL_PASS || "",
  },
});

const fromAddress = process.env.EMAIL_FROM || "mizcallofficial@gmail.com";

const OTP_TEMPLATES = {
  login: {
    subject: "Your MizCall login code",
    text: (otp, name) =>
      `Hi ${name || "there"},\n\nYour MizCall login code is ${otp}.\nIt expires in 5 minutes.\n\nIf you did not request this, please secure your account.\n\n- MizCall Team`,
  },
  registration: {
    subject: "Verify your email for MizCall",
    text: (otp, name) =>
      `Welcome ${name || ""}!\n\nYour MizCall verification code is ${otp}.\nIt expires in 5 minutes.\n\nEnter this code to finish setting up your account.\n\n- MizCall Team`,
  },
  reset: {
    subject: "Reset your MizCall password",
    text: (otp, name) =>
      `Hi ${name || "there"},\n\nUse this code to reset your MizCall password: ${otp}.\nIt expires in 5 minutes.\n\nIf you did not request this, you can ignore this email.\n\n- MizCall Team`,
  },
};

async function sendOtpEmail(type, to, otp, name = "") {
  const template = OTP_TEMPLATES[type];
  if (!template) throw new Error("Unknown OTP template");

  if (!transporter.options?.auth?.pass) {
    console.warn(`[otp:${type}] EMAIL_PASS not configured; skipping real send. OTP:`, otp);
    return { mock: true };
  }

  await transporter.sendMail({
    from: fromAddress,
    to,
    subject: template.subject,
    text: template.text(otp, name),
  });
  return { mock: false };
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

router.post("/otp/send", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "email required" });

  const otp = generateOtp();
  setOtp(email.trim().toLowerCase(), otp);

  try {
    const info = await sendOtpEmail("registration", email, otp);
    res.json({ ok: true, ...info });
  } catch (e) {
    console.error("[otp/send] sendMail failed", e);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

router.post("/otp/verify", async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: "email and otp required" });

  const ok = verifyOtp(email.trim().toLowerCase(), String(otp).trim());
  if (!ok) return res.status(400).json({ error: "Invalid or expired OTP" });
  res.json({ ok: true });
});

/* HOST LOGIN (by hostId or email; email is stored in hosts.name for now) */
router.post("/host/login", async (req, res) => {
  const { hostId, email, password, deviceName, deviceModel, platform, osName, osVersion } = req.body;
  const identifier = (hostId || email)?.trim();
  if (!identifier || !password) return res.status(400).json({ error: "hostId/email and password required" });

  const normalizedEmail = identifier.includes("@") ? identifier.toLowerCase() : null;

  const result = await query(
    `SELECT id, name, display_name, password, avatar_url, two_factor_enabled,
            enforce_single_session, enforce_user_single_session, active_session_refresh_token, active_session_expires_at
       FROM hosts WHERE id = $1 OR lower(name) = $2`,
    [identifier, normalizedEmail]
  );

  if (result.rowCount === 0)
    return res.status(401).json({ error: "Invalid host" });

  const {
    id,
    name,
    display_name,
    password: hashed,
    avatar_url,
    two_factor_enabled,
    enforce_single_session,
    enforce_user_single_session,
    active_session_refresh_token,
    active_session_expires_at,
  } = result.rows[0];
  if (!hashed) {
    return res.status(401).json({ error: "Password not set for this host" });
  }

  const match = await bcrypt.compare(password, hashed);
  if (!match) {
    logWarn("Host login failed - invalid password", "auth", { identifier });
    return res.status(401).json({ error: "Invalid credentials" });
  }

  if (enforce_single_session && active_session_refresh_token) {
    let stale = false;
    try {
      const decoded = verifyRefreshToken(active_session_refresh_token);
      if (decoded.role !== "host" || decoded.hostId !== id) {
        stale = true;
      }
    } catch {
      stale = true;
    }
    const isExpired = active_session_expires_at && new Date(active_session_expires_at) <= new Date();
    if (isExpired || stale) {
      await query(
        "UPDATE hosts SET active_session_refresh_token = NULL, active_session_expires_at = NULL WHERE id = $1",
        [id]
      );
    } else {
      return res.status(409).json({
        error: "This host is already signed in on another device. Please sign out there to continue.",
        code: "SESSION_ACTIVE",
      });
    }
  }

  if (two_factor_enabled) {
    if (!name) {
      return res.status(400).json({ error: "Host email not set; cannot send OTP" });
    }
    const otp = generateOtp();
    setOtp(`host-login:${id}`, otp);
    try {
      await sendOtpEmail("login", name, otp, display_name || name);
    } catch (err) {
      console.error("[host/login] failed to send login otp", err);
      return res.status(500).json({ error: "Failed to send OTP" });
    }
    return res.json({ requireOtp: true, hostId: id, email: name, message: "OTP sent to email" });
  }

  // If single-session enforced, block if any active session exists
  if (enforce_single_session) {
    const existing = await query("SELECT id FROM host_sessions WHERE host_id = $1 LIMIT 1", [id]);
    if (existing.rowCount > 0) {
      return res.status(409).json({
        error: "This host is already signed in on another device. Please sign out there to continue.",
        code: "SESSION_ACTIVE",
      });
    }
  }

  const accessJti = generateJti();
  const refreshJti = generateJti();
  const token = signToken({ role: "host", hostId: id }, accessJti);
  const refreshToken = signRefreshToken({ role: "host", hostId: id }, refreshJti);
  const userAgent = req.get("user-agent") || null;
  const headerDevice = req.get("x-device-name") || null;
  const deviceLabel = (deviceName || headerDevice || "").trim() || (userAgent || "").trim() || "Unknown device";
  const sessionResult = await query(
    `INSERT INTO host_sessions (host_id, device_label, device_name, model_name, platform, os_name, os_version, access_jti, refresh_token, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [id, deviceLabel, deviceName || headerDevice || null, deviceModel || null, platform || null, osName || null, osVersion || null, accessJti, refreshToken, userAgent]
  );
  const sessionId = sessionResult.rows[0].id;

  // store active session if single-session enforced
  if (enforce_single_session) {
    const decoded = jwt.decode(refreshToken);
    const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await query(
      "UPDATE hosts SET active_session_refresh_token = $1, active_session_expires_at = $2 WHERE id = $3",
      [refreshToken, expiresAt, id]
    );
  } else {
    await query(
      "UPDATE hosts SET active_session_refresh_token = NULL, active_session_expires_at = NULL WHERE id = $1",
      [id]
    );
  }

  logHostAction(id, "login", { sessionId, deviceLabel });

  res.json({
    token,
    refreshToken,
    accessJti,
    sessionId,
    hostId: id,
    name: display_name || name,
    email: name,
    avatarUrl: avatar_url,
    twoFactorEnabled: !!two_factor_enabled,
    allowMultipleSessions: !enforce_single_session,
  });
});

/* HOST REGISTRATION (name only) */
router.post("/host/register", async (req, res) => {
  const { name, email, password, deviceName, deviceModel, platform, osName, osVersion } = req.body;
  const hostName = (name || email || "").trim();
  if (!hostName || !password) return res.status(400).json({ error: "name/email and password required" });

  const hostId = await generateHostId();
  const hashed = await bcrypt.hash(password, 10);

  await query(
    `INSERT INTO hosts (id, name, display_name, password)
     VALUES ($1, $2, $3, $4)`,
    [hostId, hostName, hostName, hashed]
  );

  const accessJti = generateJti();
  const refreshJti = generateJti();
  const token = signToken({ role: "host", hostId }, accessJti);
  const refreshToken = signRefreshToken({ role: "host", hostId }, refreshJti);
  const userAgent = req.get("user-agent") || null;
  const headerDevice = req.get("x-device-name") || null;
  const deviceLabel = (deviceName || headerDevice || "").trim() || (userAgent || "").trim() || "Unknown device";
  const sessionResult = await query(
    `INSERT INTO host_sessions (host_id, device_label, device_name, model_name, platform, os_name, os_version, access_jti, refresh_token, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [hostId, deviceLabel, deviceName || headerDevice || null, deviceModel || null, platform || null, osName || null, osVersion || null, accessJti, refreshToken, userAgent]
  );
  const sessionId = sessionResult.rows[0].id;
  res.json({ hostId, token, refreshToken, accessJti, sessionId, avatarUrl: null, name: hostName, email: hostName, twoFactorEnabled: false, allowMultipleSessions: true });
});

/* USER LOGIN (by id or username, plain text password) */
router.post("/user/login", async (req, res) => {
  const { userId, password, deviceName, deviceModel, platform, osName, osVersion } = req.body;
  if (!userId || !password)
    return res.status(400).json({ error: "Missing credentials" });

  const identifier = String(userId).trim();
  const normalizedId = identifier.toUpperCase(); // accept lower/upper U123456

  // Get user and host info, including both host-level and user-level single device settings
  const result = await query(
    `SELECT u.id, u.host_id, u.username, u.password, u.enabled, u.avatar_url,
            u.enforce_single_device,
            h.enforce_user_single_session
     FROM users u
     JOIN hosts h ON u.host_id = h.id
     WHERE (u.id = $1 OR u.username = $2) AND u.password = $3`,
    [normalizedId, identifier, password]
  );

  if (result.rowCount === 0)
    return res.status(401).json({ error: "Invalid credentials" });

  if (!result.rows[0].enabled)
    return res.status(403).json({ error: "User disabled by host" });

  const { 
    id: resolvedId, 
    host_id: hostId, 
    username, 
    password: plainPassword, 
    avatar_url,
    enforce_single_device,
    enforce_user_single_session 
  } = result.rows[0];

  // Check if "one device" is enforced (user-level overrides host-level)
  // NULL = inherit from host setting, TRUE/FALSE = override
  const shouldEnforceSingleDevice = enforce_single_device !== null 
    ? enforce_single_device  // User-specific setting overrides
    : enforce_user_single_session;  // Fall back to host-level setting

  if (shouldEnforceSingleDevice) {
    // Check for existing active sessions
    const existingSession = await query(
      `SELECT id, device_label, device_name, platform, created_at 
       FROM user_sessions 
       WHERE user_id = $1 AND revoked_at IS NULL 
       ORDER BY last_seen_at DESC NULLS LAST, created_at DESC 
       LIMIT 1`,
      [resolvedId]
    );

    if (existingSession.rowCount > 0) {
      // Check if there's already a pending request
      const pendingRequest = await query(
        `SELECT id FROM user_session_requests 
         WHERE user_id = $1 AND status = 'pending'`,
        [resolvedId]
      );

      if (pendingRequest.rowCount === 0) {
        // Create a new pending session request
        const userAgent = req.get("user-agent") || null;
        const headerDevice = req.get("x-device-name") || null;
        const deviceLabel = (deviceName || headerDevice || "").trim() || (userAgent || "").trim() || "Unknown device";

        await query(
          `INSERT INTO user_session_requests 
           (user_id, host_id, device_label, device_name, model_name, platform, os_name, os_version, user_agent, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`,
          [
            resolvedId,
            hostId,
            deviceLabel,
            deviceName || headerDevice || null,
            deviceModel || null,
            platform || null,
            osName || null,
            osVersion || null,
            userAgent
          ]
        );
      }

      // Return pending status
      return res.status(202).json({
        pending: true,
        message: "Session approval pending. Please wait for host approval.",
        existingDevice: existingSession.rows[0].device_label || existingSession.rows[0].device_name || "Unknown device",
        existingPlatform: existingSession.rows[0].platform || "Unknown",
        existingLoginTime: existingSession.rows[0].created_at,
      });
    }
  }

  // No existing session or setting disabled - proceed with login
  // ALWAYS enforce single session per user: revoke all existing sessions before creating new one
  const revokeResult = await query(
    `UPDATE user_sessions 
     SET revoked_at = NOW() 
     WHERE user_id = $1 AND revoked_at IS NULL
     RETURNING id, device_label`,
    [resolvedId]
  );
  
  if (revokeResult.rowCount > 0) {
    logInfo("User session revoked (new login)", "auth", { 
      userId: resolvedId, 
      revokedCount: revokeResult.rowCount 
    });
    
    // Notify user via Socket.IO that their session was revoked
    const peer = peers.get(resolvedId);
    if (peer?.socket) {
      peer.socket.emit("SESSION_REVOKED", {
        type: "SESSION_REVOKED",
        reason: "logged_in_elsewhere",
        message: "You have been logged out because you logged in on another device.",
      });
      // Disconnect their socket after a short delay
      setTimeout(() => {
        peer.socket?.disconnect?.(true);
      }, 1000);
    }
  }
  
  const accessJti = generateJti();
  const refreshJti = generateJti();
  const token = signToken({ role: "user", userId: resolvedId, hostId }, accessJti);
  const refreshToken = signRefreshToken({ role: "user", userId: resolvedId, hostId }, refreshJti);
  
  // Create new session record
  const userAgent = req.get("user-agent") || null;
  const headerDevice = req.get("x-device-name") || null;
  const deviceLabel = (deviceName || headerDevice || "").trim() || (userAgent || "").trim() || "Unknown device";
  
  const sessionResult = await query(
    `INSERT INTO user_sessions 
     (user_id, host_id, device_label, device_name, model_name, platform, os_name, os_version, access_jti, refresh_token, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
     RETURNING id, created_at`,
    [
      resolvedId,
      hostId,
      deviceLabel,
      deviceName || headerDevice || null,
      deviceModel || null,
      platform || null,
      osName || null,
      osVersion || null,
      accessJti,
      refreshToken,
      userAgent
    ]
  );

  res.json({
    token,
    refreshToken,
    accessJti,
    sessionId: sessionResult.rows[0].id,
    hostId,
    userId: resolvedId,
    name: username || resolvedId,
    password: plainPassword,
    avatarUrl: avatar_url ?? null,
    pending: false,
    revokedSessions: revokeResult.rowCount, // Number of old sessions that were logged out
  });
});

router.post("/host/login/otp", async (req, res) => {
  const { hostId, otp, deviceName, deviceModel, platform, osName, osVersion } = req.body;
  if (!hostId || !otp) return res.status(400).json({ error: "hostId and otp required" });
  const normalizedId = hostId.trim();

  const result = await query(
    `SELECT id, name, display_name, avatar_url, two_factor_enabled,
            enforce_single_session, enforce_user_single_session, active_session_refresh_token, active_session_expires_at
       FROM hosts WHERE id = $1`,
    [normalizedId]
  );
  if (result.rowCount === 0) return res.status(401).json({ error: "Invalid host" });

  const { id, name, display_name, avatar_url, two_factor_enabled, enforce_single_session, enforce_user_single_session, active_session_refresh_token, active_session_expires_at } = result.rows[0];
  const ok = verifyOtp(`host-login:${id}`, String(otp).trim());
  if (!ok) return res.status(400).json({ error: "Invalid or expired code" });

  if (enforce_single_session && active_session_refresh_token) {
    let stale = false;
    try {
      const decoded = verifyRefreshToken(active_session_refresh_token);
      if (decoded.role !== "host" || decoded.hostId !== id) {
        stale = true;
      }
    } catch {
      stale = true;
    }
    const isExpired = active_session_expires_at && new Date(active_session_expires_at) <= new Date();
    if (isExpired || stale) {
      await query(
        "UPDATE hosts SET active_session_refresh_token = NULL, active_session_expires_at = NULL WHERE id = $1",
        [id]
      );
    } else {
      return res.status(409).json({
        error: "This host is already signed in on another device. Please sign out there to continue.",
        code: "SESSION_ACTIVE",
      });
    }
  }

  // If single-session enforced, block if any active session exists
  if (enforce_single_session) {
    const existing = await query("SELECT id FROM host_sessions WHERE host_id = $1 LIMIT 1", [id]);
    if (existing.rowCount > 0) {
      return res.status(409).json({
        error: "This host is already signed in on another device. Please sign out there to continue.",
        code: "SESSION_ACTIVE",
      });
    }
  }

  const accessJti = generateJti();
  const refreshJti = generateJti();
  const token = signToken({ role: "host", hostId: id }, accessJti);
  const refreshToken = signRefreshToken({ role: "host", hostId: id }, refreshJti);
  const userAgent = req.get("user-agent") || null;
  const headerDevice = req.get("x-device-name") || null;
  const deviceLabel = (deviceName || headerDevice || "").trim() || (userAgent || "").trim() || "Unknown device";
  const sessionResult = await query(
    `INSERT INTO host_sessions (host_id, device_label, device_name, model_name, platform, os_name, os_version, access_jti, refresh_token, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [id, deviceLabel, deviceName || headerDevice || null, deviceModel || null, platform || null, osName || null, osVersion || null, accessJti, refreshToken, userAgent]
  );
  const sessionId = sessionResult.rows[0].id;

  if (enforce_single_session) {
    const decoded = jwt.decode(refreshToken);
    const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await query(
      "UPDATE hosts SET active_session_refresh_token = $1, active_session_expires_at = $2 WHERE id = $3",
      [refreshToken, expiresAt, id]
    );
  } else {
    await query(
      "UPDATE hosts SET active_session_refresh_token = NULL, active_session_expires_at = NULL WHERE id = $1",
      [id]
    );
  }

  res.json({
    token,
    refreshToken,
    accessJti,
    sessionId,
    hostId: id,
    name: display_name || name,
    email: name,
    avatarUrl: avatar_url,
    twoFactorEnabled: !!two_factor_enabled,
    allowMultipleSessions: !enforce_single_session,
    enforceUserSingleSession: !!enforce_user_single_session,
  });
});

/* CHECK USER SESSION REQUEST STATUS */
router.get("/user/session-request", requireAuth, async (req, res) => {
  if (req.auth?.role !== "user" || !req.auth?.userId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const pendingRequest = await query(
    `SELECT id, device_label, device_name, platform, requested_at, status
     FROM user_session_requests
     WHERE user_id = $1 AND status = 'pending'
     ORDER BY requested_at DESC
     LIMIT 1`,
    [req.auth.userId]
  );

  if (pendingRequest.rowCount === 0) {
    return res.json({ pending: false });
  }

  res.json({
    pending: true,
    requestId: pendingRequest.rows[0].id,
    deviceLabel: pendingRequest.rows[0].device_label,
    deviceName: pendingRequest.rows[0].device_name,
    platform: pendingRequest.rows[0].platform,
    requestedAt: pendingRequest.rows[0].requested_at,
  });
});

router.post("/host/password/otp", async (req, res) => {
  const { hostId, email } = req.body;
  if (!hostId && !email) return res.status(400).json({ error: "hostId or email required" });
  const identifier = (hostId || email || "").trim();
  const normalizedEmail = identifier.includes("@") ? identifier.toLowerCase() : null;

  const result = await query(
    "SELECT id, name, display_name FROM hosts WHERE id = $1 OR lower(name) = $2",
    [identifier, normalizedEmail]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: "Host not found" });

  const { id, name, display_name } = result.rows[0];
  const targetEmail = name || normalizedEmail;
  if (!targetEmail) return res.status(400).json({ error: "Host email missing" });

  const code = generateOtp();
  setOtp(`host-reset:${id}`, code);
  try {
    await sendOtpEmail("reset", targetEmail, code, display_name || targetEmail);
    res.json({ ok: true, hostId: id, email: targetEmail });
  } catch (err) {
    console.error("[host/password/otp] send failed", err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

router.post("/host/password/reset", async (req, res) => {
  const { hostId, otp, newPassword } = req.body;
  if (!hostId || !otp || !newPassword) return res.status(400).json({ error: "hostId, otp, and newPassword required" });
  if (String(newPassword).length < 6) return res.status(400).json({ error: "Password too short" });

  const result = await query("SELECT id FROM hosts WHERE id = $1", [hostId.trim()]);
  if (result.rowCount === 0) return res.status(404).json({ error: "Host not found" });

  const ok = verifyOtp(`host-reset:${hostId.trim()}`, String(otp).trim());
  if (!ok) return res.status(400).json({ error: "Invalid or expired code" });

  const hashed = await bcrypt.hash(String(newPassword), 10);
  await query("UPDATE hosts SET password = $1 WHERE id = $2", [hashed, hostId.trim()]);
  res.json({ ok: true });
});

router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: "refreshToken required" });

  try {
    const payload = verifyRefreshToken(refreshToken);
    if (payload.role === "host") {
      const result = await query(
        `SELECT id, name, display_name, avatar_url, two_factor_enabled,
                enforce_single_session, active_session_refresh_token, active_session_expires_at
           FROM hosts WHERE id = $1`,
        [payload.hostId]
      );
      if (result.rowCount === 0) return res.status(401).json({ error: "Host not found" });
      const {
        id,
        name,
        display_name,
        avatar_url,
        two_factor_enabled,
        enforce_single_session,
        active_session_refresh_token,
        active_session_expires_at,
      } = result.rows[0];

      const sessionResult = await query(
        `SELECT id, revoked_at FROM host_sessions WHERE host_id = $1 AND refresh_token = $2 LIMIT 1`,
        [payload.hostId, refreshToken]
      );
      if (sessionResult.rowCount === 0) return res.status(401).json({ error: "Session expired. Please sign in again." });
      if (sessionResult.rows[0].revoked_at) return res.status(401).json({ error: "Session expired. Please sign in again." });

      const accessJti = generateJti();
      const refreshJti = generateJti();
      const token = signToken({ role: "host", hostId: id }, accessJti);
      const nextRefresh = signRefreshToken({ role: "host", hostId: id }, refreshJti);

      const refreshUserAgent = req.get("user-agent") || null;
      const refreshHeaderDevice = req.get("x-device-name") || null;
      const refreshDeviceLabel =
        (req.body?.deviceName || refreshHeaderDevice || "").trim() ||
        (refreshUserAgent || "").trim() ||
        null;
      const refreshModel = req.body?.deviceModel || null;
      const refreshPlatform = req.body?.platform || null;
      const refreshOsName = req.body?.osName || null;
      const refreshOsVersion = req.body?.osVersion || null;
      await query(
        `UPDATE host_sessions
         SET refresh_token = $1,
             access_jti = $2,
             last_seen_at = now(),
             revoked_at = NULL,
             device_label = COALESCE($4, device_label, user_agent, 'Unknown device'),
             device_name = COALESCE($5, device_name),
             model_name = COALESCE($6, model_name),
             platform = COALESCE($7, platform),
             os_name = COALESCE($8, os_name),
             os_version = COALESCE($9, os_version),
             user_agent = COALESCE(user_agent, $10)
         WHERE id = $3`,
        [nextRefresh, accessJti, sessionResult.rows[0].id, refreshDeviceLabel, req.body?.deviceName || refreshHeaderDevice || null, refreshModel, refreshPlatform, refreshOsName, refreshOsVersion, refreshUserAgent]
      );

      if (enforce_single_session) {
        const decoded = jwt.decode(nextRefresh);
        const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : null;
        await query(
          "UPDATE hosts SET active_session_refresh_token = $1, active_session_expires_at = $2 WHERE id = $3",
          [nextRefresh, expiresAt, id]
        );
      } else {
        await query(
          "UPDATE hosts SET active_session_refresh_token = NULL, active_session_expires_at = NULL WHERE id = $1",
          [id]
        );
      }
      return res.json({
        token,
        refreshToken: nextRefresh,
        accessJti,
        sessionId: sessionResult.rows[0].id,
        hostId: id,
        name: display_name || name,
        email: name,
        avatarUrl: avatar_url,
        twoFactorEnabled: !!two_factor_enabled,
        allowMultipleSessions: !enforce_single_session,
      });
    }

    if (payload.role === "user") {
      const result = await query(
        `SELECT id, host_id, username, enabled, password, avatar_url
         FROM users WHERE id = $1`,
        [payload.userId]
      );
      if (result.rowCount === 0) return res.status(401).json({ error: "User not found" });
      const { id, host_id: hostId, username, enabled, password, avatar_url } = result.rows[0];
      if (!enabled) return res.status(403).json({ error: "User disabled by host" });

      const token = signToken({ role: "user", userId: id, hostId });
      const nextRefresh = signRefreshToken({ role: "user", userId: id, hostId });
      return res.json({
        token,
        refreshToken: nextRefresh,
        hostId,
        userId: id,
        name: username || id,
        avatarUrl: avatar_url ?? null,
        password,
      });
    }

    return res.status(400).json({ error: "Unknown role" });
  } catch (err) {
    console.error("[auth/refresh] failed", err);
    return res.status(401).json({ error: "Invalid refresh token" });
  }
});

/* LOGOUT - Clear active session for hosts */
router.post("/logout", requireAuth, async (req, res) => {
  try {
    if (req.auth.role === "host") {
      if (req.sessionId) {
        await query("DELETE FROM host_sessions WHERE id = $1", [req.sessionId]);
      } else if (req.auth.jti) {
        await query("DELETE FROM host_sessions WHERE host_id = $1 AND access_jti = $2", [req.auth.hostId, req.auth.jti]);
      }
      await query(
        "UPDATE hosts SET active_session_refresh_token = NULL, active_session_expires_at = NULL WHERE id = $1",
        [req.auth.hostId]
      );
      console.log(`[auth/logout] Cleared active session for host ${req.auth.hostId}`);
    }
    // For users, we don't track active sessions, so nothing to clear
    res.json({ ok: true });
  } catch (err) {
    console.error("[auth/logout] failed", err);
    res.status(500).json({ error: "Logout failed" });
  }
});

export default router;

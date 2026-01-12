import { Router } from "express";
import bcrypt from "bcrypt";
import { query } from "../../services/db.js";
import { signToken } from "../../services/auth.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

/* ADMIN LOGIN */
router.post("/login", async (req, res) => {
  console.log("[Admin] Login attempt:", req.body.username);
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  // Check environment variable for admin credentials (simple approach)
  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!adminPasswordHash) {
    console.error("[Admin] ADMIN_PASSWORD_HASH not set in environment variables");
    return res.status(500).json({ error: "Admin authentication not configured" });
  }

  if (username !== adminUsername) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Verify password
  const match = await bcrypt.compare(password, adminPasswordHash);
  if (!match) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Generate token
  const token = signToken({ role: "admin", username: adminUsername });

  res.json({
    token,
    id: "admin",
    username: adminUsername,
    name: "Administrator",
  });
});

/* DASHBOARD STATS */
router.get("/dashboard", requireAuth, requireAdmin, async (req, res) => {
  try {
    // Get total hosts
    const totalHostsResult = await query(`SELECT COUNT(*) as total FROM hosts`);
    const totalHosts = parseInt(totalHostsResult.rows[0].total);

    // Get total users across all hosts
    const totalUsersResult = await query(`SELECT COUNT(*) as total FROM users`);
    const totalUsers = parseInt(totalUsersResult.rows[0].total);

    // Get active users
    const activeUsersResult = await query(`SELECT COUNT(*) as total FROM users WHERE enabled = true`);
    const activeUsers = parseInt(activeUsersResult.rows[0].total);

    // Get total calls
    const totalCallsResult = await query(`SELECT COUNT(*) as total FROM rooms`);
    const totalCalls = parseInt(totalCallsResult.rows[0].total);

    // Get active calls
    const activeCallsResult = await query(`SELECT COUNT(*) as total FROM rooms WHERE status = 'started'`);
    const activeCalls = parseInt(activeCallsResult.rows[0].total);

    // Get total recordings
    const totalRecordingsResult = await query(`SELECT COUNT(*) as total FROM clips`);
    const totalRecordings = parseInt(totalRecordingsResult.rows[0].total);

    // Calculate storage (simplified - you might want to query actual file sizes)
    const storageUsed = "0 MB"; // TODO: Calculate actual storage

    res.json({
      totalHosts,
      activeHosts: totalHosts, // All hosts are considered active for now
      totalUsers,
      activeUsers,
      totalCalls,
      activeCalls,
      totalRecordings,
      storageUsed,
      serverStatus: "Online",
      mediasoupStatus: "Online",
      databaseStatus: "Online",
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

/* LIST ALL HOSTS */
router.get("/hosts", requireAuth, requireAdmin, async (req, res) => {
  try {
    const hostsResult = await query(`
      SELECT 
        h.id,
        h.name,
        h.display_name,
        h.avatar_url,
        h.two_factor_enabled,
        h.email_otp_enabled,
        h.mobile_otp_enabled,
        h.phone_number,
        h.enforce_single_session,
        h.enforce_user_single_session,
        h.call_background_url,
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT CASE WHEN u.enabled = true THEN u.id END) as active_users,
        COUNT(DISTINCT r.id) as total_calls
      FROM hosts h
      LEFT JOIN users u ON u.host_id = h.id
      LEFT JOIN rooms r ON r.host_id = h.id
      GROUP BY h.id
      ORDER BY h.id
    `);

    const hosts = hostsResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      email: row.name, // name field stores email
      avatarUrl: row.avatar_url,
      enabled: true, // No enabled flag on hosts yet
      twoFactorEnabled: row.two_factor_enabled,
      emailOtpEnabled: row.email_otp_enabled,
      mobileOtpEnabled: row.mobile_otp_enabled,
      phoneNumber: row.phone_number,
      allowMultipleSessions: !row.enforce_single_session,
      enforceUserSingleSession: row.enforce_user_single_session,
      totalUsers: parseInt(row.total_users) || 0,
      activeUsers: parseInt(row.active_users) || 0,
      totalCalls: parseInt(row.total_calls) || 0,
      callBackgroundUrl: row.call_background_url,
    }));

    res.json({ hosts });
  } catch (error) {
    console.error("Failed to fetch hosts:", error);
    res.status(500).json({ error: "Failed to fetch hosts" });
  }
});

/* GET HOST DETAILS */
router.get("/hosts/:hostId", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { hostId } = req.params;

    const hostResult = await query(
      `SELECT 
        h.id,
        h.name,
        h.display_name,
        h.avatar_url,
        h.two_factor_enabled,
        h.email_otp_enabled,
        h.mobile_otp_enabled,
        h.phone_number,
        h.enforce_single_session,
        h.enforce_user_single_session,
        h.call_background_url,
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT CASE WHEN u.enabled = true THEN u.id END) as active_users,
        COUNT(DISTINCT r.id) as total_calls
      FROM hosts h
      LEFT JOIN users u ON u.host_id = h.id
      LEFT JOIN rooms r ON r.host_id = h.id
      WHERE h.id = $1
      GROUP BY h.id`,
      [hostId]
    );

    if (hostResult.rows.length === 0) {
      return res.status(404).json({ error: "Host not found" });
    }

    const host = hostResult.rows[0];
    res.json({
      id: host.id,
      name: host.name,
      displayName: host.display_name,
      email: host.name,
      avatarUrl: host.avatar_url,
      enabled: true,
      twoFactorEnabled: host.two_factor_enabled,
      emailOtpEnabled: host.email_otp_enabled,
      mobileOtpEnabled: host.mobile_otp_enabled,
      phoneNumber: host.phone_number,
      allowMultipleSessions: !host.enforce_single_session,
      enforceUserSingleSession: host.enforce_user_single_session,
      totalUsers: parseInt(host.total_users) || 0,
      activeUsers: parseInt(host.active_users) || 0,
      totalCalls: parseInt(host.total_calls) || 0,
      callBackgroundUrl: host.call_background_url,
    });
  } catch (error) {
    console.error("Failed to fetch host details:", error);
    res.status(500).json({ error: "Failed to fetch host details" });
  }
});

/* GET HOST'S USERS */
router.get("/hosts/:hostId/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { hostId } = req.params;

    const usersResult = await query(
      `SELECT id, username, enabled, avatar_url, enforce_single_device
       FROM users
       WHERE host_id = $1
       ORDER BY username`,
      [hostId]
    );

    res.json({ users: usersResult.rows });
  } catch (error) {
    console.error("Failed to fetch users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

/* GET HOST'S CALLS */
router.get("/hosts/:hostId/calls", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { hostId } = req.params;

    const callsResult = await query(
      `SELECT id, status, started_at, ended_at
       FROM rooms
       WHERE host_id = $1
       ORDER BY started_at DESC
       LIMIT 50`,
      [hostId]
    );

    res.json({ calls: callsResult.rows });
  } catch (error) {
    console.error("Failed to fetch calls:", error);
    res.status(500).json({ error: "Failed to fetch calls" });
  }
});

/* GET HOST'S SESSIONS */
router.get("/hosts/:hostId/sessions", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { hostId } = req.params;

    const sessionsResult = await query(
      `SELECT id, device_label, device_name, platform, last_seen_at, created_at
       FROM host_sessions
       WHERE host_id = $1
       ORDER BY last_seen_at DESC NULLS LAST`,
      [hostId]
    );

    res.json({ sessions: sessionsResult.rows });
  } catch (error) {
    console.error("Failed to fetch sessions:", error);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

/* GET SYSTEM LOGS */
router.get("/logs", requireAuth, requireAdmin, async (req, res) => {
  try {
    // For now, return mock logs
    // In production, you would integrate with your logging system
    const logs = [
      {
        id: "1",
        timestamp: new Date().toISOString(),
        level: "info",
        service: "backend",
        message: "Server started successfully",
      },
      {
        id: "2",
        timestamp: new Date(Date.now() - 60000).toISOString(),
        level: "info",
        service: "mediasoup",
        message: "Mediasoup server initialized",
      },
      {
        id: "3",
        timestamp: new Date(Date.now() - 120000).toISOString(),
        level: "info",
        service: "database",
        message: "Database connection established",
      },
    ];

    // TODO: Integrate with actual logging system
    // You might want to:
    // 1. Read from log files
    // 2. Query a logs table in database
    // 3. Use a logging service like Winston, Bunyan, etc.
    
    res.json({ logs });
  } catch (error) {
    console.error("Failed to fetch logs:", error);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

export default router;

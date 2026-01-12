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

  console.log("[Admin] Environment check:", {
    hasUsername: !!process.env.ADMIN_USERNAME,
    hasPasswordHash: !!adminPasswordHash,
    usernameMatch: username === adminUsername,
    expectedUsername: adminUsername,
  });

  if (!adminPasswordHash) {
    console.error("[Admin] ADMIN_PASSWORD_HASH not set in environment variables");
    return res.status(500).json({ error: "Admin authentication not configured" });
  }

  if (username !== adminUsername) {
    console.log("[Admin] Username mismatch - expected:", adminUsername, "got:", username);
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Verify password
  console.log("[Admin] Verifying password...");
  const match = await bcrypt.compare(password, adminPasswordHash);
  console.log("[Admin] Password match:", match);
  
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

    // Save today's snapshot
    await query(`
      INSERT INTO stats_history (date, total_hosts, total_users, total_calls, total_recordings, active_users, active_calls)
      VALUES (CURRENT_DATE, $1, $2, $3, $4, $5, $6)
      ON CONFLICT (date) DO UPDATE SET
        total_hosts = $1,
        total_users = $2,
        total_calls = $3,
        total_recordings = $4,
        active_users = $5,
        active_calls = $6
    `, [totalHosts, totalUsers, totalCalls, totalRecordings, activeUsers, activeCalls]);

    // Get historical data for charts (last 6 months)
    const historyResult = await query(`
      SELECT date, total_hosts, total_users, total_calls
      FROM stats_history
      WHERE date >= CURRENT_DATE - INTERVAL '6 months'
      ORDER BY date ASC
    `);

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
      history: historyResult.rows,
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
        h.enabled,
        h.two_factor_enabled,
        h.email_otp_enabled,
        h.mobile_otp_enabled,
        h.phone_number,
        h.enforce_single_session,
        h.enforce_user_single_session,
        h.call_background_url,
        h.membership_type,
        h.membership_start_date,
        h.membership_end_date,
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
      enabled: row.enabled ?? true,
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
      membershipType: row.membership_type,
      membershipStartDate: row.membership_start_date,
      membershipEndDate: row.membership_end_date,
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
        h.enabled,
        h.two_factor_enabled,
        h.email_otp_enabled,
        h.mobile_otp_enabled,
        h.phone_number,
        h.enforce_single_session,
        h.enforce_user_single_session,
        h.call_background_url,
        h.membership_type,
        h.membership_start_date,
        h.membership_end_date,
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
      enabled: host.enabled ?? true,
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
      membershipType: host.membership_type,
      membershipStartDate: host.membership_start_date,
      membershipEndDate: host.membership_end_date,
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

/* CREATE NEW HOST */
router.post("/hosts", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, displayName, membershipType, membershipEndDate } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Check if host with this email already exists
    const existingHost = await query(
      `SELECT id FROM hosts WHERE LOWER(name) = LOWER($1)`,
      [email]
    );

    if (existingHost.rows.length > 0) {
      return res.status(400).json({ error: "Host with this email already exists" });
    }

    // Generate host ID
    const { generateHostId } = await import("../../services/id.js");
    const hostId = await generateHostId();

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Set membership dates
    const startDate = new Date();
    const endDate = membershipEndDate 
      ? new Date(membershipEndDate)
      : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year default

    // Insert new host
    await query(
      `INSERT INTO hosts 
       (id, name, display_name, password, membership_type, membership_start_date, membership_end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [hostId, email, displayName || email, hashedPassword, membershipType || 'Free', startDate, endDate]
    );

    res.json({
      success: true,
      hostId,
      message: "Host created successfully",
    });
  } catch (error) {
    console.error("Failed to create host:", error);
    res.status(500).json({ error: "Failed to create host" });
  }
});

/* UPDATE HOST */
router.patch("/hosts/:hostId", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { hostId } = req.params;
    const { displayName, email, enabled } = req.body;

    const updates = [];
    const values = [];
    let idx = 1;

    if (displayName !== undefined) {
      updates.push(`display_name = $${idx++}`);
      values.push(displayName);
    }

    if (email !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(email);
    }

    if (enabled !== undefined) {
      updates.push(`enabled = $${idx++}`);
      values.push(enabled);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(hostId);
    await query(
      `UPDATE hosts SET ${updates.join(", ")} WHERE id = $${idx}`,
      values
    );

    res.json({ success: true, message: "Host updated successfully" });
  } catch (error) {
    console.error("Failed to update host:", error);
    res.status(500).json({ error: "Failed to update host" });
  }
});

/* RESET HOST PASSWORD */
router.post("/hosts/:hostId/reset-password", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { hostId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await query(
      `UPDATE hosts SET password = $1 WHERE id = $2`,
      [hashedPassword, hostId]
    );

    res.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.error("Failed to reset password:", error);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

/* UPDATE HOST SUBSCRIPTION */
router.patch("/hosts/:hostId/subscription", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { hostId } = req.params;
    const { membershipType, membershipEndDate, action } = req.body;

    if (action === 'end') {
      // End subscription immediately
      await query(
        `UPDATE hosts 
         SET membership_type = 'Free', 
             membership_end_date = NOW() 
         WHERE id = $1`,
        [hostId]
      );
      return res.json({ success: true, message: "Subscription ended" });
    }

    if (action === 'renew') {
      // Renew subscription
      const endDate = membershipEndDate 
        ? new Date(membershipEndDate)
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now

      await query(
        `UPDATE hosts 
         SET membership_type = $1, 
             membership_start_date = NOW(),
             membership_end_date = $2 
         WHERE id = $3`,
        [membershipType || 'Premium', endDate, hostId]
      );
      return res.json({ success: true, message: "Subscription renewed" });
    }

    // Regular update
    const updates = [];
    const values = [];
    let idx = 1;

    if (membershipType !== undefined) {
      updates.push(`membership_type = $${idx++}`);
      values.push(membershipType);
    }

    if (membershipEndDate !== undefined) {
      updates.push(`membership_end_date = $${idx++}`);
      values.push(new Date(membershipEndDate));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(hostId);
    await query(
      `UPDATE hosts SET ${updates.join(", ")} WHERE id = $${idx}`,
      values
    );

    res.json({ success: true, message: "Subscription updated successfully" });
  } catch (error) {
    console.error("Failed to update subscription:", error);
    res.status(500).json({ error: "Failed to update subscription" });
  }
});

/* DELETE HOST */
router.delete("/hosts/:hostId", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { hostId } = req.params;

    // Delete host (CASCADE will handle related records)
    const result = await query(
      `DELETE FROM hosts WHERE id = $1 RETURNING id`,
      [hostId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Host not found" });
    }

    res.json({ success: true, message: "Host deleted successfully" });
  } catch (error) {
    console.error("Failed to delete host:", error);
    res.status(500).json({ error: "Failed to delete host" });
  }
});

/* GET ALL USERS (ACROSS ALL HOSTS) */
router.get("/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const usersResult = await query(`
      SELECT 
        u.id,
        u.username,
        u.enabled,
        u.host_id,
        u.avatar_url,
        u.enforce_single_device,
        u.last_speaking,
        h.name as host_name,
        h.display_name as host_display_name
      FROM users u
      LEFT JOIN hosts h ON h.id = u.host_id
      ORDER BY u.username
    `);

    const users = usersResult.rows.map(row => ({
      id: row.id,
      username: row.username,
      enabled: row.enabled,
      hostId: row.host_id,
      avatarUrl: row.avatar_url,
      enforceSingleDevice: row.enforce_single_device,
      lastSpeaking: row.last_speaking,
      hostName: row.host_display_name || row.host_name,
    }));

    res.json({ users });
  } catch (error) {
    console.error("Failed to fetch users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

/* UPDATE USER STATUS */
router.patch("/users/:hostId/:userId", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { hostId, userId } = req.params;
    const { enabled } = req.body;

    if (enabled === undefined) {
      return res.status(400).json({ error: "enabled field is required" });
    }

    await query(
      `UPDATE users SET enabled = $1 WHERE id = $2 AND host_id = $3`,
      [enabled, userId, hostId]
    );

    res.json({ success: true, message: "User updated successfully" });
  } catch (error) {
    console.error("Failed to update user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

/* RESET USER PASSWORD */
router.post("/users/:hostId/:userId/reset-password", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { hostId, userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    await query(
      `UPDATE users SET password = $1 WHERE id = $2 AND host_id = $3`,
      [newPassword, userId, hostId]
    );

    res.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.error("Failed to reset user password:", error);
    res.status(500).json({ error: "Failed to reset user password" });
  }
});

export default router;

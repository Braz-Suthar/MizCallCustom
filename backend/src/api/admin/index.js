import { Router } from "express";
import bcrypt from "bcryptjs";
import os from "os";
import fs from "fs";
import path from "path";
import { query } from "../../services/db.js";
import { signToken } from "../../services/auth.js";
import { requireAuth } from "../../middleware/auth.js";
import { logAdminAction, logInfo, logWarn, logError } from "../../services/logger.js";

const router = Router();

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

/* ADMIN LOGIN */
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  
  logInfo(`Admin login attempt: ${username}`, 'admin', { username, ipAddress });

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  // Check environment variable for admin credentials (simple approach)
  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!adminPasswordHash) {
    logError("Admin password hash not configured", "admin");
    return res.status(500).json({ error: "Admin authentication not configured" });
  }

  if (username !== adminUsername) {
    logWarn("Admin login failed - invalid username", "admin", { attempted: username });
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Verify password
  const match = await bcrypt.compare(password, adminPasswordHash);
  
  if (!match) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Generate token
  const token = signToken({ role: "admin", username: adminUsername });

  logAdminAction(adminUsername, 'login', { success: true }, ipAddress);

  res.json({
    token,
    id: "admin",
    username: adminUsername,
    name: "Administrator",
  });
});

// Store previous CPU times for calculating usage
let previousCpuTimes = null;

/* SYSTEM METRICS */
router.get("/system-metrics", requireAuth, requireAdmin, async (req, res) => {
  try {
    const cpuUsage = os.loadavg();
    const cpus = os.cpus();
    const cores = cpus.length;
    
    // Calculate CPU percentage from load average
    // Load average represents processes waiting to run
    // Approximate percentage: (load / cores) * 100, capped at 100%
    const cpuPercent = Math.min(100, (cpuUsage[0] / cores) * 100).toFixed(2);
    
    // Get current CPU times
    const currentTimes = cpus.map(cpu => ({
      idle: cpu.times.idle,
      total: Object.values(cpu.times).reduce((a, b) => a + b, 0),
    }));

    let coreStats = [];
    
    if (previousCpuTimes) {
      // Calculate per-core usage from difference
      coreStats = cpus.map((cpu, index) => {
        const current = currentTimes[index];
        const previous = previousCpuTimes[index];
        
        const idleDiff = current.idle - previous.idle;
        const totalDiff = current.total - previous.total;
        
        const usagePercent = totalDiff > 0 
          ? (((totalDiff - idleDiff) / totalDiff) * 100).toFixed(1)
          : '0.0';
        
        return {
          core: index,
          model: cpu.model.replace(/\s+/g, ' ').trim(),
          speed: cpu.speed,
          usagePercent,
        };
      });
    } else {
      // First call - use load average as estimate
      coreStats = cpus.map((cpu, index) => ({
        core: index,
        model: cpu.model.replace(/\s+/g, ' ').trim(),
        speed: cpu.speed,
        usagePercent: cpuPercent,
      }));
    }

    // Store current times for next request
    previousCpuTimes = currentTimes;

    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    const metrics = {
      cpu: {
        load1min: cpuUsage[0].toFixed(2),
        load5min: cpuUsage[1].toFixed(2),
        load15min: cpuUsage[2].toFixed(2),
        cores,
        percentage: cpuPercent,
        coreStats,
      },
      memory: {
        total: totalMemory,
        free: freeMemory,
        used: usedMemory,
        usedPercent: ((usedMemory / totalMemory) * 100).toFixed(2),
      },
      uptime: {
        seconds: os.uptime(),
        formatted: formatUptime(os.uptime()),
      },
      platform: {
        type: os.platform(),
        release: os.release(),
        hostname: os.hostname(),
      },
    };

    res.json(metrics);
  } catch (error) {
    logError("System metrics error", "admin", { error: error.message });
    res.status(500).json({ error: "Failed to fetch system metrics" });
  }
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
    const limit = parseInt(req.query.limit) || 500;
    const offset = parseInt(req.query.offset) || 0;
    const level = req.query.level;
    const service = req.query.service;

    let sql = `SELECT 
      id::text,
      timestamp,
      level,
      service,
      message,
      metadata,
      host_id,
      user_id,
      admin_id,
      ip_address
    FROM system_logs
    WHERE 1=1`;

    const params = [];
    let paramIndex = 1;

    if (level) {
      sql += ` AND level = $${paramIndex}`;
      params.push(level);
      paramIndex++;
    }

    if (service) {
      sql += ` AND service = $${paramIndex}`;
      params.push(service);
      paramIndex++;
    }

    sql += ` ORDER BY timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    const logs = result.rows.map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      level: row.level,
      service: row.service,
      message: row.message,
      metadata: row.metadata,
    }));

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

    logAdminAction(req.username, 'create_host', { hostId, email });

    res.json({
      success: true,
      hostId,
      message: "Host created successfully",
    });
  } catch (error) {
    logError("Failed to create host", 'admin', { error: error.message });
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

    logAdminAction(req.username, 'update_host', { hostId, updates: Object.keys(req.body) });

    res.json({ success: true, message: "Host updated successfully" });
  } catch (error) {
    logError("Failed to update host", 'admin', { error: error.message, hostId });
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

    logAdminAction(req.username, 'reset_host_password', { hostId });

    res.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    logError("Failed to reset host password", 'admin', { error: error.message, hostId });
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

    logAdminAction(req.username, 'delete_host', { hostId });

    res.json({ success: true, message: "Host deleted successfully" });
  } catch (error) {
    logError("Failed to delete host", 'admin', { error: error.message, hostId });
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

/* GET PERFORMANCE METRICS */
router.get("/performance-metrics", requireAuth, requireAdmin, async (req, res) => {
  try {
    // Get slowest endpoints (last 24 hours)
    const slowestEndpoints = await query(`
      SELECT 
        endpoint,
        method,
        AVG(duration_ms) as avg_duration,
        MAX(duration_ms) as max_duration,
        COUNT(*) as request_count
      FROM api_performance_metrics
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY endpoint, method
      ORDER BY avg_duration DESC
      LIMIT 10
    `);

    // Get request rate by minute (last hour)
    const requestRate = await query(`
      SELECT 
        DATE_TRUNC('minute', timestamp) as minute,
        COUNT(*) as count
      FROM api_performance_metrics
      WHERE timestamp >= NOW() - INTERVAL '1 hour'
      GROUP BY minute
      ORDER BY minute DESC
      LIMIT 60
    `);

    // Get error rate (last 24 hours)
    const errorRate = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE status_code >= 400) as errors,
        COUNT(*) as total
      FROM api_performance_metrics
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `);

    // Get response time distribution (last 24 hours)
    const responseTimeDistribution = await query(`
      SELECT 
        DATE_TRUNC('hour', timestamp) as hour,
        AVG(duration_ms) as avg_duration,
        MAX(duration_ms) as max_duration,
        MIN(duration_ms) as min_duration
      FROM api_performance_metrics
      WHERE timestamp >= NOW() - INTERVAL '24 hours'
      GROUP BY hour
      ORDER BY hour ASC
    `);

    res.json({
      slowestEndpoints: slowestEndpoints.rows,
      requestRate: requestRate.rows,
      errorRate: errorRate.rows[0] || { errors: 0, total: 0 },
      responseTimeDistribution: responseTimeDistribution.rows,
    });
  } catch (error) {
    console.error("Failed to fetch performance metrics:", error);
    res.status(500).json({ error: "Failed to fetch performance metrics" });
  }
});

/* GET ADVANCED ANALYTICS */
router.get("/analytics", requireAuth, requireAdmin, async (req, res) => {
  try {
    // Call duration analytics
    const callDurations = await query(`
      SELECT 
        DATE_TRUNC('day', started_at) as day,
        AVG(EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at)) / 60) as avg_duration_minutes,
        COUNT(*) as call_count
      FROM rooms
      WHERE started_at >= NOW() - INTERVAL '30 days'
      GROUP BY day
      ORDER BY day ASC
    `);

    // Peak usage hours
    const peakHours = await query(`
      SELECT 
        EXTRACT(HOUR FROM started_at) as hour,
        COUNT(*) as call_count
      FROM rooms
      WHERE started_at >= NOW() - INTERVAL '7 days'
      GROUP BY hour
      ORDER BY call_count DESC
    `);

    // Host activity (calls per host)
    const hostActivity = await query(`
      SELECT 
        h.id,
        h.display_name,
        h.name as email,
        COUNT(r.id) as total_calls,
        MAX(r.started_at) as last_call_at
      FROM hosts h
      LEFT JOIN rooms r ON r.host_id = h.id
      WHERE r.started_at >= NOW() - INTERVAL '30 days' OR r.started_at IS NULL
      GROUP BY h.id, h.display_name, h.name
      ORDER BY total_calls DESC
      LIMIT 20
    `);

    // User retention (users who made calls in last 30 days vs total)
    const retention = await query(`
      SELECT 
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT CASE 
          WHEN EXISTS (
            SELECT 1 FROM rooms r 
            WHERE r.started_at >= NOW() - INTERVAL '30 days'
            AND r.host_id = u.host_id
          ) THEN u.id 
        END) as active_users
      FROM users u
    `);

    res.json({
      callDurations: callDurations.rows,
      peakHours: peakHours.rows,
      hostActivity: hostActivity.rows,
      retention: retention.rows[0] || { total_users: 0, active_users: 0 },
    });
  } catch (error) {
    console.error("Failed to fetch analytics:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

/* TRIGGER DATABASE BACKUP */
router.post("/database/backup", requireAuth, requireAdmin, async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `mizcall_backup_${timestamp}.sql`;
    
    logAdminAction(req.username, 'trigger_backup', { filename });

    // Store backup metadata
    const result = await query(
      `INSERT INTO database_backups (filename, triggered_by, status)
       VALUES ($1, $2, 'pending')
       RETURNING id`,
      [filename, req.username]
    );

    // Execute backup script in background
    const { spawn } = await import('child_process');
    const backupScript = '/app/scripts/backup-database.sh';
    
    // Check if script exists (in Docker) or use local path
    const scriptPath = fs.existsSync(backupScript) 
      ? backupScript 
      : path.join(process.cwd(), 'scripts', 'backup-database.sh');

    if (fs.existsSync(scriptPath)) {
      try {
        const backupProcess = spawn('sh', [scriptPath, filename], {
          env: {
            ...process.env,
            DB_HOST: process.env.DB_HOST || 'postgres',
            DB_PORT: process.env.DB_PORT || '5432',
            DB_NAME: process.env.DB_NAME || 'mizcallcustom',
            DB_USER: process.env.DB_USER || 'miz',
            DB_PASSWORD: process.env.DB_PASSWORD || 'mizpass',
            PGPASSWORD: process.env.DB_PASSWORD || 'mizpass',
            BACKUP_DIR: process.env.BACKUP_DIR || '/var/app/backups',
          },
          detached: true,
          stdio: 'ignore',
        });

        backupProcess.unref(); // Allow process to run independently
        
        backupProcess.on('error', (err) => {
          logError("Backup process spawn error", 'admin', { error: err.message, filename });
          query(
            `UPDATE database_backups SET status = 'failed', error_message = $1 WHERE id = $2`,
            [err.message, result.rows[0].id]
          ).catch(() => {});
        });
        
        logInfo("Backup process started", 'admin', { filename, backupId: result.rows[0].id });
      } catch (spawnError) {
        logError("Failed to spawn backup process", 'admin', { error: spawnError.message, filename });
        await query(
          `UPDATE database_backups SET status = 'failed', error_message = $1 WHERE id = $2`,
          [spawnError.message, result.rows[0].id]
        );
      }
    } else {
      // Fallback: Mark as pending with note
      await query(
        `UPDATE database_backups SET error_message = 'Backup script not found - will be created on next rebuild' WHERE id = $1`,
        [result.rows[0].id]
      );
      
      logWarn("Backup script not found", 'admin', { 
        filename, 
        searchedPath: scriptPath,
        note: 'Rebuild backend container to enable automatic backups'
      });
    }
    
    res.json({ 
      success: true, 
      message: "Backup initiated. Check backup history for completion status.",
      filename,
    });
  } catch (error) {
    logError("Failed to trigger backup", 'admin', { error: error.message });
    res.status(500).json({ error: "Failed to trigger backup" });
  }
});

/* GET BACKUP HISTORY */
router.get("/database/backups", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT id, filename, triggered_by, status, file_size, created_at, completed_at
      FROM database_backups
      ORDER BY created_at DESC
      LIMIT 50
    `);

    res.json({ backups: result.rows });
  } catch (error) {
    console.error("Failed to fetch backups:", error);
    res.status(500).json({ error: "Failed to fetch backup history" });
  }
});

/* DOWNLOAD BACKUP FILE */
router.get("/database/backups/:filename/download", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Verify backup exists in database
    const backupRecord = await query(
      `SELECT id, filename, status, file_size FROM database_backups WHERE filename = $1`,
      [filename]
    );

    if (backupRecord.rows.length === 0) {
      return res.status(404).json({ error: "Backup not found" });
    }

    if (backupRecord.rows[0].status !== 'completed') {
      return res.status(400).json({ error: "Backup is not completed yet" });
    }

    const backupDir = process.env.BACKUP_DIR || '/var/app/backups';
    const filePath = path.join(backupDir, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Backup file not found on disk" });
    }

    logAdminAction(req.username, 'download_backup', { filename });

    // Send file
    res.download(filePath, filename, (err) => {
      if (err) {
        logError("Backup download failed", 'admin', { error: err.message, filename });
      }
    });
  } catch (error) {
    logError("Failed to download backup", 'admin', { error: error.message });
    res.status(500).json({ error: "Failed to download backup" });
  }
});

export default router;

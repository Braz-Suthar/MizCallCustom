import { Router } from "express";
import { query } from "../../services/db.js";
import { requireAuth, requireHost, requireUser } from "../../middleware/auth.js";
import { registerDeviceToken, unregisterDeviceToken, notifyHostUsers, notifyUser, isFirebaseAvailable } from "../../services/firebase.js";

const router = Router();

/**
 * POST /notifications/register-token
 * Register device FCM token
 */
router.post("/register-token", requireAuth, async (req, res) => {
  try {
    const { token, platform, deviceName } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: "token required" });
    }

    const userId = req.userId || null;
    const hostId = req.hostId || null;

    const result = await registerDeviceToken(userId, hostId, token, platform, deviceName);
    
    if (result.success) {
      res.json({ 
        ok: true, 
        message: result.updated ? "Token updated" : "Token registered",
        firebaseAvailable: isFirebaseAvailable()
      });
    } else {
      res.status(500).json({ error: result.error || "Failed to register token" });
    }
  } catch (error) {
    console.error("[Notifications] Register token error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /notifications/unregister-token
 * Unregister device FCM token
 */
router.post("/unregister-token", requireAuth, async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: "token required" });
    }

    const result = await unregisterDeviceToken(token);
    
    if (result.success) {
      res.json({ ok: true, message: "Token unregistered" });
    } else {
      res.status(500).json({ error: result.error || "Failed to unregister token" });
    }
  } catch (error) {
    console.error("[Notifications] Unregister token error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /notifications/send
 * Send custom notification (host only)
 */
router.post("/send", requireAuth, requireHost, async (req, res) => {
  try {
    const { title, body, recipientType, recipientId, data } = req.body;
    
    if (!title || !body) {
      return res.status(400).json({ error: "title and body required" });
    }

    if (!recipientType || !["user", "all_users"].includes(recipientType)) {
      return res.status(400).json({ error: "recipientType must be 'user' or 'all_users'" });
    }

    if (recipientType === "user" && !recipientId) {
      return res.status(400).json({ error: "recipientId required for user notifications" });
    }

    let sendResult;

    if (recipientType === "all_users") {
      // Send to all users under this host
      sendResult = await notifyHostUsers(req.hostId, { title, body, data: { ...data, type: "custom" } });
    } else if (recipientType === "user") {
      // Verify user belongs to this host
      const userCheck = await query(
        `SELECT id FROM users WHERE id = $1 AND host_id = $2`,
        [recipientId, req.hostId]
      );
      
      if (userCheck.rowCount === 0) {
        return res.status(404).json({ error: "User not found or doesn't belong to you" });
      }

      sendResult = await notifyUser(recipientId, { title, body, data: { ...data, type: "custom" } });
    }

    // Log notification
    await query(
      `INSERT INTO notifications (sender_id, recipient_type, recipient_id, title, body, data, notification_type, success_count, failure_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        req.hostId,
        recipientType,
        recipientId || null,
        title,
        body,
        JSON.stringify(data || {}),
        "custom",
        sendResult.successCount || 0,
        sendResult.failureCount || 0,
      ]
    );

    res.json({
      ok: true,
      message: "Notification sent",
      successCount: sendResult.successCount || 0,
      failureCount: sendResult.failureCount || 0,
      firebaseAvailable: isFirebaseAvailable(),
    });
  } catch (error) {
    console.error("[Notifications] Send error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /notifications/history
 * Get notification history (host only)
 */
router.get("/history", requireAuth, requireHost, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const result = await query(
      `SELECT id, recipient_type, recipient_id, title, body, notification_type, 
              sent_at, success_count, failure_count
       FROM notifications
       WHERE sender_id = $1
       ORDER BY sent_at DESC
       LIMIT $2 OFFSET $3`,
      [req.hostId, limit, offset]
    );

    res.json({
      notifications: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    console.error("[Notifications] History error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /notifications/status
 * Check Firebase availability
 */
router.get("/status", requireAuth, async (req, res) => {
  res.json({
    available: isFirebaseAvailable(),
    message: isFirebaseAvailable() 
      ? "Push notifications are enabled" 
      : "Push notifications are not configured",
  });
});

export default router;

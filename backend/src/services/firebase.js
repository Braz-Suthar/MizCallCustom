import admin from "firebase-admin";
import { query } from "./db.js";
import fs from "fs";

let firebaseInitialized = false;

/**
 * Initialize Firebase Admin SDK
 * Requires FIREBASE_SERVICE_ACCOUNT_PATH environment variable
 * pointing to the service account JSON file
 */
export function initializeFirebase() {
  if (firebaseInitialized) {
    console.log("[Firebase] Already initialized");
    return;
  }

  try {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    
    if (!serviceAccountPath) {
      console.warn("[Firebase] ⚠️ FIREBASE_SERVICE_ACCOUNT_PATH not set. Push notifications will be disabled.");
      console.warn("[Firebase] To enable notifications:");
      console.warn("[Firebase] 1. Download service account JSON from Firebase Console");
      console.warn("[Firebase] 2. Set FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/serviceAccountKey.json");
      return;
    }

    const serviceAccount = JSON.parse(
      fs.readFileSync(serviceAccountPath, "utf8")
    );

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    firebaseInitialized = true;
    console.log("[Firebase] ✅ Initialized successfully");
  } catch (error) {
    console.error("[Firebase] ❌ Initialization failed:", error.message);
    console.warn("[Firebase] Push notifications will be disabled");
  }
}

/**
 * Check if Firebase is initialized
 */
export function isFirebaseAvailable() {
  return firebaseInitialized;
}

/**
 * Send notification to specific device token
 */
export async function sendToDevice(token, { title, body, data = {} }) {
  if (!firebaseInitialized) {
    console.warn("[Firebase] Not initialized, skipping notification");
    return { success: false, error: "Firebase not initialized" };
  }

  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
      token,
    };

    const response = await admin.messaging().send(message);
    console.log("[Firebase] ✅ Notification sent:", response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error("[Firebase] ❌ Send failed:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send notification to multiple devices
 */
export async function sendToDevices(tokens, { title, body, data = {} }) {
  if (!firebaseInitialized) {
    console.warn("[Firebase] Not initialized, skipping notifications");
    return { successCount: 0, failureCount: tokens.length };
  }

  if (!tokens || tokens.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
    };

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      ...message,
    });

    console.log("[Firebase] Sent to", tokens.length, "devices:", {
      successCount: response.successCount,
      failureCount: response.failureCount,
    });

    // Remove invalid tokens from database
    if (response.failureCount > 0) {
      const invalidTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error?.code === "messaging/registration-token-not-registered") {
          invalidTokens.push(tokens[idx]);
        }
      });

      if (invalidTokens.length > 0) {
        console.log("[Firebase] Removing", invalidTokens.length, "invalid tokens");
        await query(
          `DELETE FROM device_tokens WHERE token = ANY($1)`,
          [invalidTokens]
        );
      }
    }

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    console.error("[Firebase] ❌ Multicast send failed:", error.message);
    return { successCount: 0, failureCount: tokens.length };
  }
}

/**
 * Send notification to all users of a specific host
 */
export async function notifyHostUsers(hostId, { title, body, data = {} }) {
  try {
    // Get all device tokens for users under this host
    const result = await query(
      `SELECT token FROM device_tokens WHERE user_id IN (
        SELECT id FROM users WHERE host_id = $1 AND enabled = true
      )`,
      [hostId]
    );

    if (result.rowCount === 0) {
      console.log("[Firebase] No device tokens found for host:", hostId);
      return { successCount: 0, failureCount: 0 };
    }

    const tokens = result.rows.map((row) => row.token);
    console.log("[Firebase] Notifying", tokens.length, "devices for host:", hostId);

    return await sendToDevices(tokens, { title, body, data });
  } catch (error) {
    console.error("[Firebase] ❌ Failed to notify host users:", error.message);
    return { successCount: 0, failureCount: 0 };
  }
}

/**
 * Send notification to specific user
 */
export async function notifyUser(userId, { title, body, data = {} }) {
  try {
    // Get all device tokens for this user
    const result = await query(
      `SELECT token FROM device_tokens WHERE user_id = $1`,
      [userId]
    );

    if (result.rowCount === 0) {
      console.log("[Firebase] No device tokens found for user:", userId);
      return { successCount: 0, failureCount: 0 };
    }

    const tokens = result.rows.map((row) => row.token);
    console.log("[Firebase] Notifying", tokens.length, "devices for user:", userId);

    return await sendToDevices(tokens, { title, body, data });
  } catch (error) {
    console.error("[Firebase] ❌ Failed to notify user:", error.message);
    return { successCount: 0, failureCount: 0 };
  }
}

/**
 * Register device token
 */
export async function registerDeviceToken(userId, hostId, token, platform, deviceName = null) {
  try {
    // Ensure only one ID is set (database constraint)
    const finalUserId = userId || null;
    const finalHostId = userId ? null : (hostId || null);
    
    if (!finalUserId && !finalHostId) {
      throw new Error("Either userId or hostId must be provided");
    }

    // Check if token already exists
    const existing = await query(
      `SELECT id FROM device_tokens WHERE token = $1`,
      [token]
    );

    if (existing.rowCount > 0) {
      // Update last_used_at
      await query(
        `UPDATE device_tokens 
         SET last_used_at = NOW(), device_name = COALESCE($1, device_name), platform = COALESCE($2, platform)
         WHERE token = $3`,
        [deviceName, platform, token]
      );
      console.log("[Firebase] Updated existing token for:", finalUserId || finalHostId);
      return { success: true, updated: true };
    }

    // Insert new token (only one of user_id or host_id)
    await query(
      `INSERT INTO device_tokens (user_id, host_id, token, platform, device_name)
       VALUES ($1, $2, $3, $4, $5)`,
      [finalUserId, finalHostId, token, platform, deviceName]
    );

    console.log("[Firebase] ✅ Registered new device token for:", finalUserId || finalHostId, "platform:", platform);
    return { success: true, updated: false };
  } catch (error) {
    console.error("[Firebase] ❌ Failed to register token:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Unregister device token
 */
export async function unregisterDeviceToken(token) {
  try {
    const result = await query(
      `DELETE FROM device_tokens WHERE token = $1 RETURNING id`,
      [token]
    );

    if (result.rowCount > 0) {
      console.log("[Firebase] ✅ Unregistered device token");
      return { success: true };
    } else {
      console.log("[Firebase] Token not found (may already be deleted)");
      return { success: true };
    }
  } catch (error) {
    console.error("[Firebase] ❌ Failed to unregister token:", error.message);
    return { success: false, error: error.message };
  }
}

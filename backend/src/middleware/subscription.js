import { query } from "../services/db.js";
import { logWarn } from "../services/logger.js";

// Middleware to check if host has active subscription
export const requireActiveSubscription = async (req, res, next) => {
  try {
    if (req.role !== "host") {
      // Only check for hosts
      return next();
    }

    const hostId = req.hostId;
    
    // Get host subscription info
    const result = await query(
      `SELECT membership_type, membership_end_date, enabled 
       FROM hosts 
       WHERE id = $1`,
      [hostId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Host not found" });
    }

    const host = result.rows[0];
    
    // Check if host is enabled
    if (!host.enabled) {
      return res.status(403).json({ 
        error: "Account disabled",
        message: "Your account has been disabled. Please contact support."
      });
    }

    // Check subscription status
    const endDate = host.membership_end_date ? new Date(host.membership_end_date) : null;
    const isExpired = endDate && endDate < new Date();

    if (isExpired) {
      logWarn("Host attempted action with expired subscription", "subscription", {
        hostId,
        membershipType: host.membership_type,
        endDate: endDate.toISOString(),
      });

      return res.status(403).json({
        error: "Subscription expired",
        message: host.membership_type === 'Trial' 
          ? "Your 7-day trial has expired. Please upgrade to continue using MizCall."
          : "Your subscription has expired. Please renew to continue.",
        subscriptionExpired: true,
        membershipType: host.membership_type,
        endDate: endDate.toISOString(),
      });
    }

    // Subscription is active - proceed
    next();
  } catch (error) {
    console.error("[Subscription] Check failed:", error);
    res.status(500).json({ error: "Failed to verify subscription" });
  }
};

import { Router } from "express";
import { query } from "../../services/db.js";
import { requireAuth, requireUser } from "../../middleware/auth.js";

const router = Router();

/**
 * GET /user/active-call
 * Fetch the active call for the logged-in user
 */
router.get("/active-call", requireAuth, requireUser, async (req, res) => {
  try {
    const { userId, hostId } = req.auth;
    
    console.log("[GET /user/active-call]", { userId, hostId });
    
    // Find active call for this user's host
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
      return res.status(404).json({ error: "No active call found" });
    }
    
    const call = result.rows[0];
    
    res.json({
      call: {
        id: call.id,
        started_at: call.started_at,
        ended_at: call.ended_at,
        status: call.status,
      }
    });
  } catch (error) {
    console.error("[GET /user/active-call] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;


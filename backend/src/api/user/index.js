import { Router } from "express";
import { query } from "../../services/db.js";
import { requireAuth, requireUser } from "../../middleware/auth.js";
import { getRoom } from "../../signaling/socket-io.js";

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
        room_id,
        started_at,
        ended_at,
        status
       FROM calls
       WHERE host_id = $1 
         AND status = 'started'
       ORDER BY started_at DESC 
       LIMIT 1`,
      [hostId]
    );
    
    if (result.rowCount === 0) {
      console.log("[GET /user/active-call] No active call found for host:", hostId);
      return res.status(404).json({ error: "No active call found" });
    }
    
    const call = result.rows[0];
    const roomId = call.room_id || call.id;
    
    console.log("[GET /user/active-call] Call found:", {
      id: call.id,
      roomId: roomId,
      status: call.status
    });
    
    // Get live room data from Socket.IO memory (has router caps and producer IDs)
    let routerRtpCapabilities = null;
    let hostProducerId = null;
    
    try {
      const liveRoom = getRoom(roomId);
      if (liveRoom) {
        routerRtpCapabilities = liveRoom.routerRtpCapabilities;
        hostProducerId = liveRoom.hostProducerId;
        
        console.log("[GET /user/active-call] Live room data:", {
          roomId: roomId,
          hasRouterCaps: !!routerRtpCapabilities,
          hostProducerId: hostProducerId
        });
      } else {
        console.warn("[GET /user/active-call] No live room found in memory for roomId:", roomId);
      }
    } catch (err) {
      console.error("[GET /user/active-call] Error getting live room:", err);
    }
    
    res.json({
      call: {
        id: call.id,
        room_id: roomId,
        started_at: call.started_at,
        ended_at: call.ended_at,
        status: call.status,
        router_rtp_capabilities: routerRtpCapabilities,
        host_producer_id: hostProducerId,
      }
    });
  } catch (error) {
    console.error("[GET /user/active-call] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;


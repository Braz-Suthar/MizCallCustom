import { verifyToken } from "../services/auth.js";
import { query } from "../services/db.js";

export async function requireAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1] || req.query.token;
    if (!token) return res.sendStatus(401);

    const decoded = verifyToken(token);
    
    // Admin role - no additional session checks needed
    if (decoded.role === "admin") {
      req.auth = decoded;
      req.role = "admin";
      req.username = decoded.username;
      return next();
    }
    
    if (decoded.role === "host") {
      // Enforce active session membership for host access tokens
      if (!decoded.jti) return res.sendStatus(401);
      const result = await query(
        "SELECT id, revoked_at, device_label, user_agent FROM host_sessions WHERE host_id = $1 AND access_jti = $2 LIMIT 1",
        [decoded.hostId, decoded.jti]
      );
      if (result.rowCount === 0) return res.sendStatus(401);
      if (result.rows[0].revoked_at) return res.sendStatus(401);
      const headerDevice = req.get("x-device-name") || null;
      const userAgent = req.get("user-agent") || null;
      const currentLabel = result.rows[0].device_label;
      if ((headerDevice || userAgent) && (!currentLabel || currentLabel === "Unknown device")) {
        query(
          `UPDATE host_sessions
             SET device_label = COALESCE($1, device_label, user_agent, 'Unknown device'),
                 device_name = COALESCE($1, device_name),
                 user_agent = COALESCE(user_agent, $2)
           WHERE id = $3`,
          [headerDevice || userAgent, userAgent, result.rows[0].id]
        ).catch(() => {});
      }
      req.auth = decoded;
      req.role = "host";
      req.sessionId = result.rows[0].id;
      // best-effort last_seen update
      query("UPDATE host_sessions SET last_seen_at = now() WHERE id = $1", [result.rows[0].id]).catch(() => {});
      return next();
    }
    req.auth = decoded;
    req.role = decoded.role;
    next();
  } catch {
    res.sendStatus(401);
  }
}

export function requireHost(req, res, next) {
  if (req.auth.role !== "host") return res.sendStatus(403);
  req.hostId = req.auth.hostId;
  next();
}

export function requireUser(req, res, next) {
  if (req.auth.role !== "user") return res.sendStatus(403);
  req.userId = req.auth.userId;
  next();
}

import { verifyToken } from "../services/auth.js";
import { query } from "../services/db.js";

export async function requireAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1] || req.query.token;
    if (!token) return res.sendStatus(401);

    const decoded = verifyToken(token);
    if (decoded.role === "host") {
      // Enforce active session membership for host access tokens
      if (!decoded.jti) return res.sendStatus(401);
      const result = await query(
        "SELECT id, revoked_at FROM host_sessions WHERE host_id = $1 AND access_jti = $2 LIMIT 1",
        [decoded.hostId, decoded.jti]
      );
      if (result.rowCount === 0) return res.sendStatus(401);
      if (result.rows[0].revoked_at) return res.sendStatus(401);
      req.auth = decoded;
      req.sessionId = result.rows[0].id;
      // best-effort last_seen update
      query("UPDATE host_sessions SET last_seen_at = now() WHERE id = $1", [result.rows[0].id]).catch(() => {});
      return next();
    }
    req.auth = decoded;
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

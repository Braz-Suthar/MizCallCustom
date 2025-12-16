import { verifyToken } from "../services/auth.js";

export function requireAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.sendStatus(401);

    req.auth = verifyToken(token);
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

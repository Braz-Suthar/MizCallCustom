import { Router } from "express";
import { query } from "../../services/db.js";
import { signToken } from "../../services/auth.js";

const router = Router();

/* HOST LOGIN */
router.post("/host/login", async (req, res) => {
  const { hostId } = req.body;
  if (!hostId) return res.status(400).json({ error: "hostId required" });

  const result = await query(
    "SELECT id FROM hosts WHERE id = $1",
    [hostId]
  );

  if (result.rowCount === 0)
    return res.status(401).json({ error: "Invalid host" });

  const token = signToken({ role: "host", hostId });
  res.json({ token });
});

/* USER LOGIN (PLAIN TEXT PASSWORD) */
router.post("/user/login", async (req, res) => {
  const { userId, password } = req.body;
  if (!userId || !password)
    return res.status(400).json({ error: "Missing credentials" });

  const result = await query(
    `SELECT id, enabled FROM users 
     WHERE id = $1 AND password = $2`,
    [userId, password]
  );

  if (result.rowCount === 0)
    return res.status(401).json({ error: "Invalid credentials" });

  if (!result.rows[0].enabled)
    return res.status(403).json({ error: "User disabled by host" });

  const token = signToken({ role: "user", userId });
  res.json({ token });
});

export default router;

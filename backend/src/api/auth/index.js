import { Router } from "express";
import { query } from "../../services/db.js";
import { signToken } from "../../services/auth.js";
import { generateHostId } from "../../services/id.js";

const router = Router();

/* HOST LOGIN (by hostId or name/email) */
router.post("/host/login", async (req, res) => {
  const { hostId } = req.body;
  const identifier = hostId?.trim();
  if (!identifier) return res.status(400).json({ error: "hostId required" });

  const result = await query(
    "SELECT id FROM hosts WHERE id = $1 OR name = $1",
    [identifier]
  );

  if (result.rowCount === 0)
    return res.status(401).json({ error: "Invalid host" });

  const id = result.rows[0].id;
  const token = signToken({ role: "host", hostId: id });
  res.json({ token, hostId: id });
});

/* HOST REGISTRATION (name only) */
router.post("/host/register", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });

  const hostId = await generateHostId();

  await query(
    `INSERT INTO hosts (id, name)
     VALUES ($1, $2)`,
    [hostId, name]
  );

  const token = signToken({ role: "host", hostId });
  res.json({ hostId, token });
});

/* USER LOGIN (PLAIN TEXT PASSWORD) */
router.post("/user/login", async (req, res) => {
  const { userId, password } = req.body;
  if (!userId || !password)
    return res.status(400).json({ error: "Missing credentials" });

  const result = await query(
    `SELECT id, host_id, enabled FROM users 
     WHERE id = $1 AND password = $2`,
    [userId, password]
  );

  if (result.rowCount === 0)
    return res.status(401).json({ error: "Invalid credentials" });

  if (!result.rows[0].enabled)
    return res.status(403).json({ error: "User disabled by host" });

  const hostId = result.rows[0].host_id;
  const token = signToken({ role: "user", userId, hostId });
  res.json({ token, hostId });
});

export default router;

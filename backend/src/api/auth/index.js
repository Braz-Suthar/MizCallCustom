import { Router } from "express";
import { query } from "../../services/db.js";
import { signToken } from "../../services/auth.js";
import { generateHostId } from "../../services/id.js";

const router = Router();

/* HOST LOGIN (by hostId or email; email is stored in hosts.name for now) */
router.post("/host/login", async (req, res) => {
  const { hostId, email } = req.body;
  const identifier = (hostId || email)?.trim();
  if (!identifier) return res.status(400).json({ error: "hostId or email required" });

  const normalizedEmail = identifier.includes("@") ? identifier.toLowerCase() : null;

  const result = await query(
    "SELECT id FROM hosts WHERE id = $1 OR lower(name) = $2",
    [identifier, normalizedEmail]
  );

  if (result.rowCount === 0)
    return res.status(401).json({ error: "Invalid host" });

  const id = result.rows[0].id;
  const token = signToken({ role: "host", hostId: id });
  res.json({ token, hostId: id });
});

/* HOST REGISTRATION (name only) */
router.post("/host/register", async (req, res) => {
  const { name, email } = req.body;
  const hostName = (name || email || "").trim();
  if (!hostName) return res.status(400).json({ error: "name or email required" });

  const hostId = await generateHostId();

  await query(
    `INSERT INTO hosts (id, name)
     VALUES ($1, $2)`,
    [hostId, hostName]
  );

  const token = signToken({ role: "host", hostId });
  res.json({ hostId, token });
});

/* USER LOGIN (by id or username, plain text password) */
router.post("/user/login", async (req, res) => {
  const { userId, password } = req.body;
  if (!userId || !password)
    return res.status(400).json({ error: "Missing credentials" });

  const identifier = String(userId).trim();
  const normalizedId = identifier.toUpperCase(); // accept lower/upper U123456

  const result = await query(
    `SELECT id, host_id, enabled FROM users 
     WHERE (id = $1 OR username = $2) AND password = $3`,
    [normalizedId, identifier, password]
  );

  if (result.rowCount === 0)
    return res.status(401).json({ error: "Invalid credentials" });

  if (!result.rows[0].enabled)
    return res.status(403).json({ error: "User disabled by host" });

  const resolvedId = result.rows[0].id;
  const hostId = result.rows[0].host_id;
  const token = signToken({ role: "user", userId: resolvedId, hostId });
  res.json({ token, hostId, userId: resolvedId });
});

export default router;

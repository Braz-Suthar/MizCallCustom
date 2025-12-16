import { Router } from "express";
import { v4 as uuid } from "uuid";
import { query } from "../../services/db.js";
import { requireAuth, requireHost } from "../../middleware/auth.js";

const router = Router();

/* CREATE USER */
router.post("/users", requireAuth, requireHost, async (req, res) => {
  const id = uuid();
  const username = req.body.username;
  const password = req.body.password || uuid().slice(0, 8);

  if (!username)
    return res.status(400).json({ error: "username required" });

  await query(
    `INSERT INTO users (id, host_id, username, password)
     VALUES ($1, $2, $3, $4)`,
    [id, req.hostId, username, password]
  );

  res.json({ userId: id, password });
});

/* ENABLE / DISABLE USER */
router.patch(
  "/users/:userId",
  requireAuth,
  requireHost,
  async (req, res) => {
    const { enabled } = req.body;

    await query(
      `UPDATE users 
       SET enabled = $1 
       WHERE id = $2 AND host_id = $3`,
      [enabled, req.params.userId, req.hostId]
    );

    res.sendStatus(204);
  }
);

/* START CALL (LOGICAL ONLY FOR NOW) */
router.post("/calls/start", requireAuth, requireHost, async (req, res) => {
  const roomId = uuid();

  await query(
    `INSERT INTO rooms (id, host_id, status, started_at)
     VALUES ($1, $2, 'started', NOW())`,
    [roomId, req.hostId]
  );

  res.json({ roomId });
});

export default router;

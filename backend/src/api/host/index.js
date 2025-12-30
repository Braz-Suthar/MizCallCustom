import { Router } from "express";
import { v4 as uuid } from "uuid";
import { query } from "../../services/db.js";
import { requireAuth, requireHost } from "../../middleware/auth.js";
import { generateUserId } from "../../services/id.js";
import { broadcastCallEvent } from "../../signaling/ws.js";

const router = Router();

/* CREATE USER */
router.post("/users", requireAuth, requireHost, async (req, res) => {
  const id = await generateUserId();
  const username = req.body.username;
  const password = req.body.password || Math.random().toString(36).slice(2, 10);

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
    const { enabled, password } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;

    if (enabled !== undefined) {
      updates.push(`enabled = $${idx++}`);
      values.push(enabled);
    }

    if (password) {
      updates.push(`password = $${idx++}`);
      values.push(password);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "no fields to update" });
    }

    values.push(req.params.userId, req.hostId);

    await query(
      `UPDATE users 
       SET ${updates.join(", ")} 
       WHERE id = $${idx++} AND host_id = $${idx}`,
      values
    );

    res.sendStatus(204);
  }
);

/* DELETE USER */
router.delete(
  "/users/:userId",
  requireAuth,
  requireHost,
  async (req, res) => {
    await query(
      `DELETE FROM users 
       WHERE id = $1 AND host_id = $2`,
      [req.params.userId, req.hostId]
    );
    res.sendStatus(204);
  }
);

/* LIST USERS FOR HOST */
router.get("/users", requireAuth, requireHost, async (req, res) => {
  const result = await query(
    `SELECT id, username, enabled, last_speaking
     FROM users
     WHERE host_id = $1
     ORDER BY username`,
    [req.hostId]
  );
  res.json({ users: result.rows });
});

/* START CALL (LOGICAL ONLY FOR NOW) */
router.post("/calls/start", requireAuth, requireHost, async (req, res) => {
  const roomId = uuid();

  await query(
    `INSERT INTO rooms (id, host_id, status, started_at)
     VALUES ($1, $2, 'started', NOW())`,
    [roomId, req.hostId]
  );

  res.json({ roomId });

  broadcastCallEvent(req.hostId, {
    type: "call-started",
    roomId,
    hostId: req.hostId,
  });
});

/* LIST CALLS FOR HOST */
router.get("/calls", requireAuth, requireHost, async (req, res) => {
  const result = await query(
    `SELECT id, status, started_at, ended_at
     FROM rooms
     WHERE host_id = $1
     ORDER BY started_at DESC`,
    [req.hostId]
  );
  res.json({ calls: result.rows });
});

/* END CALL */
router.patch("/calls/:id/end", requireAuth, requireHost, async (req, res) => {
  const { id } = req.params;
  await query(
    `UPDATE rooms
     SET status = 'ended',
         ended_at = NOW()
     WHERE id = $1 AND host_id = $2`,
    [id, req.hostId]
  );

  broadcastCallEvent(req.hostId, {
    type: "call-stopped",
    roomId: id,
    hostId: req.hostId
  });

  res.json({ ok: true });
});

export default router;

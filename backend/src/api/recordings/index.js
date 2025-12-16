import { Router } from "express";
import { query } from "../../services/db.js";
import {
  requireAuth,
  requireHost,
  requireUser
} from "../../middleware/auth.js";

const router = Router();

/* HOST VIEW */
router.get("/host", requireAuth, requireHost, async (req, res) => {
  const rows = await query(
    `SELECT c.*, u.username 
     FROM clips c
     JOIN users u ON u.id = c.user_id
     WHERE c.host_id = $1
     ORDER BY c.start_time DESC`,
    [req.hostId]
  );

  const result = {};
  for (const row of rows.rows) {
    result[row.username] ??= {};
    const day = row.start_time.toISOString().slice(0, 10);
    result[row.username][day] ??= [];
    result[row.username][day].push(row);
  }

  res.json(result);
});

/* USER VIEW */
router.get("/user", requireAuth, requireUser, async (req, res) => {
  const rows = await query(
    `SELECT * FROM clips
     WHERE user_id = $1
     ORDER BY start_time DESC`,
    [req.userId]
  );

  const result = {};
  for (const row of rows.rows) {
    const day = row.start_time.toISOString().slice(0, 10);
    result[day] ??= [];
    result[day].push(row);
  }

  res.json(result);
});

export default router;

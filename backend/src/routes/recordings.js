import express from "express";
import fs from "fs";
import { pool } from "../db/pool.js";

const router = express.Router();

/* ---------------- HOST LIST ---------------- */
router.get("/host/recordings", async (req, res) => {
  if (req.auth.role !== "host") {
    return res.sendStatus(403);
  }

  const { rows } = await pool.query(
    `SELECT r.*, u.username AS user_name
     FROM recordings r
     JOIN users u ON u.id = r.user_id
     WHERE r.host_id = $1
     ORDER BY r.started_at DESC`,
    [req.auth.hostId]
  );

  const result = {};

  for (const r of rows) {
    const date = r.started_at.toISOString().slice(0, 10);
    const time = r.started_at.toISOString().slice(11, 19);

    result[r.user_name] ??= {};
    result[r.user_name][date] ??= [];

    result[r.user_name][date].push({
      id: r.id,
      time
    });
  }

  res.json(result);
});

/* ---------------- USER LIST ---------------- */
router.get("/user/recordings", async (req, res) => {
  if (req.auth.role !== "user") {
    return res.sendStatus(403);
  }

  const { rows } = await pool.query(
    `SELECT *
     FROM recordings
     WHERE user_id = $1
     ORDER BY started_at DESC`,
    [req.auth.userId]
  );

  const result = {};

  for (const r of rows) {
    const date = r.started_at.toISOString().slice(0, 10);
    const time = r.started_at.toISOString().slice(11, 19);

    result[date] ??= [];
    result[date].push({
      id: r.id,
      time
    });
  }

  res.json(result);
});

/* ---------------- STREAM AUDIO ---------------- */
router.get("/recordings/:id/stream", async (req, res) => {
  const { id } = req.params;

  const { rows } = await pool.query(
    `SELECT *
     FROM recordings
     WHERE id = $1`,
    [id]
  );

  if (!rows.length) return res.sendStatus(404);

  const rec = rows[0];

  // permission check
  if (
    (req.auth.role === "host" && rec.host_id !== req.auth.hostId) ||
    (req.auth.role === "user" && rec.user_id !== req.auth.userId)
  ) {
    return res.sendStatus(403);
  }

  res.setHeader("Content-Type", "audio/wav");
  fs.createReadStream(rec.file_path).pipe(res);
});

/* ---------------- HOST DELETE ---------------- */
router.delete("/host/recordings/:id", async (req, res) => {
  if (req.auth.role !== "host") {
    return res.sendStatus(403);
  }

  const { rows } = await pool.query(
    `DELETE FROM recordings
     WHERE id = $1 AND host_id = $2
     RETURNING file_path`,
    [req.params.id, req.auth.hostId]
  );

  if (!rows.length) return res.sendStatus(404);

  fs.unlink(rows[0].file_path, () => {});
  res.sendStatus(204);
});

export default router;

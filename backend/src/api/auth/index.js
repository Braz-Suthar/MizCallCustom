import { Router } from "express";
import { query } from "../../services/db.js";
import { signToken } from "../../services/auth.js";
import { generateHostId } from "../../services/id.js";
import nodemailer from "nodemailer";
import { setOtp, verifyOtp } from "../../services/otpStore.js";
import bcrypt from "bcryptjs";

const router = Router();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "mizcallofficial@gmail.com",
    pass: process.env.EMAIL_PASS || "",
  },
});

const fromAddress = process.env.EMAIL_FROM || "mizcallofficial@gmail.com";

router.post("/otp/send", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "email required" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  setOtp(email.trim().toLowerCase(), otp);

  if (!transporter.options?.auth?.pass) {
    console.warn("[otp/send] EMAIL_PASS not configured; skipping real send. OTP:", otp);
    return res.json({ ok: true, mock: true });
  }

  try {
    await transporter.sendMail({
      from: fromAddress,
      to: email,
      subject: "Your MizCall OTP",
      text: `Your MizCall OTP is ${otp}. It expires in 5 minutes.`,
    });
    res.json({ ok: true });
  } catch (e) {
    console.error("[otp/send] sendMail failed", e);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

router.post("/otp/verify", async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: "email and otp required" });

  const ok = verifyOtp(email.trim().toLowerCase(), String(otp).trim());
  if (!ok) return res.status(400).json({ error: "Invalid or expired OTP" });
  res.json({ ok: true });
});

/* HOST LOGIN (by hostId or email; email is stored in hosts.name for now) */
router.post("/host/login", async (req, res) => {
  const { hostId, email, password } = req.body;
  const identifier = (hostId || email)?.trim();
  if (!identifier || !password) return res.status(400).json({ error: "hostId/email and password required" });

  const normalizedEmail = identifier.includes("@") ? identifier.toLowerCase() : null;

  const result = await query(
    "SELECT id, name, display_name, password, avatar_url FROM hosts WHERE id = $1 OR lower(name) = $2",
    [identifier, normalizedEmail]
  );

  if (result.rowCount === 0)
    return res.status(401).json({ error: "Invalid host" });

  const { id, name, display_name, password: hashed, avatar_url } = result.rows[0];
  if (!hashed) {
    return res.status(401).json({ error: "Password not set for this host" });
  }

  const match = await bcrypt.compare(password, hashed);
  if (!match) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken({ role: "host", hostId: id });
  res.json({ token, hostId: id, name: display_name || name, email: name, avatarUrl: avatar_url });
});

/* HOST REGISTRATION (name only) */
router.post("/host/register", async (req, res) => {
  const { name, email, password } = req.body;
  const hostName = (name || email || "").trim();
  if (!hostName || !password) return res.status(400).json({ error: "name/email and password required" });

  const hostId = await generateHostId();
  const hashed = await bcrypt.hash(password, 10);

  await query(
    `INSERT INTO hosts (id, name, display_name, password)
     VALUES ($1, $2, $3, $4)`,
    [hostId, hostName, hostName, hashed]
  );

  const token = signToken({ role: "host", hostId });
  res.json({ hostId, token, avatarUrl: null, name: hostName, email: hostName });
});

/* USER LOGIN (by id or username, plain text password) */
router.post("/user/login", async (req, res) => {
  const { userId, password } = req.body;
  if (!userId || !password)
    return res.status(400).json({ error: "Missing credentials" });

  const identifier = String(userId).trim();
  const normalizedId = identifier.toUpperCase(); // accept lower/upper U123456

  const result = await query(
    `SELECT id, host_id, username, password, enabled, avatar_url FROM users 
     WHERE (id = $1 OR username = $2) AND password = $3`,
    [normalizedId, identifier, password]
  );

  if (result.rowCount === 0)
    return res.status(401).json({ error: "Invalid credentials" });

  if (!result.rows[0].enabled)
    return res.status(403).json({ error: "User disabled by host" });

  const { id: resolvedId, host_id: hostId, username, password: plainPassword, avatar_url } = result.rows[0];
  const token = signToken({ role: "user", userId: resolvedId, hostId });
  res.json({
    token,
    hostId,
    userId: resolvedId,
    name: username || resolvedId,
    password: plainPassword,
    avatarUrl: avatar_url ?? null,
  });
});

export default router;

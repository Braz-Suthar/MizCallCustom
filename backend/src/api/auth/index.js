import { Router } from "express";
import { query } from "../../services/db.js";
import { signToken } from "../../services/auth.js";
import { generateHostId } from "../../services/id.js";
import nodemailer from "nodemailer";
import { setOtp, verifyOtp } from "../../services/otpStore.js";

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
  const { name, email, password } = req.body;
  const hostName = (name || email || "").trim();
  if (!hostName) return res.status(400).json({ error: "name or email required" });

  const hostId = await generateHostId();

  await query(
    `INSERT INTO hosts (id, name, password)
     VALUES ($1, $2, $3)`,
    [hostId, hostName, password || ""]
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

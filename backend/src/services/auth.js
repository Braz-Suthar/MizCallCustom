import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || SECRET;
const ACCESS_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "12h";
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "30d";

export function signToken(payload) {
  return jwt.sign(payload, SECRET, {
    expiresIn: ACCESS_EXPIRES_IN,
  });
}

export function signRefreshToken(payload) {
  return jwt.sign({ ...payload, type: "refresh" }, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES_IN,
  });
}

export function verifyToken(token, opts = {}) {
  return jwt.verify(token, SECRET, opts);
}

export function verifyRefreshToken(token) {
  const decoded = jwt.verify(token, REFRESH_SECRET);
  if (decoded.type !== "refresh") {
    throw new Error("Invalid token type");
  }
  return decoded;
}

import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;

export function signToken(payload) {
  return jwt.sign(payload, SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "12h"
  });
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

import { query } from "./db.js";

function randomDigits(len = 6) {
  return Math.floor(Math.random() * Math.pow(10, len))
    .toString()
    .padStart(len, "0");
}

async function generatePrefixedId(prefix, table) {
  // Keep trying until we find an unused id. Collisions are very unlikely.
  // We add a hard cap just to avoid infinite loops in pathological cases.
  for (let i = 0; i < 20; i++) {
    const candidate = `${prefix}${randomDigits(6)}`;
    const exists = await query(
      `SELECT 1 FROM ${table} WHERE id = $1 LIMIT 1`,
      [candidate]
    );
    if (exists.rowCount === 0) return candidate;
  }
  throw new Error("Failed to generate unique id");
}

export async function generateHostId() {
  return generatePrefixedId("H", "hosts");
}

export async function generateUserId() {
  return generatePrefixedId("U", "users");
}


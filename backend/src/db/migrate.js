import fs from "fs";
import path from "path";
import { pool } from "./pool.js";

const MIGRATIONS_DIR = path.resolve("migrations");

export async function runMigrations() {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(
      path.join(MIGRATIONS_DIR, file),
      "utf8"
    );

    console.log(`🗄 Running migration: ${file}`);
    await pool.query(sql);
  }
}

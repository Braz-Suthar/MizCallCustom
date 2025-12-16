import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST || "postgres",
  port: 5432,
  user: process.env.DB_USER || "miz",
  password: process.env.DB_PASSWORD || "miz",
  database: process.env.DB_NAME || "mizcallcustom"
});

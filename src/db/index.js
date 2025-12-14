import sqlite3 from "sqlite3";
import { open } from "sqlite";

export async function openDb() {
  return open({
    filename: "./database.sqlite",
    driver: sqlite3.Database,
  });
}

export async function initDb() {
  const db = await openDb();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bungie_name TEXT UNIQUE,
      membership_id TEXT,
      membership_type INTEGER,
      kd REAL,
      kda REAL,
      trials_wins INTEGER,
      trials_losses INTEGER,
      updated_at TEXT
    );
  `);
  return db;
}

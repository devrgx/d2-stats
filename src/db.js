import sqlite3 from "sqlite3";
import { open } from "sqlite";

export async function getDB() {
  const db = await open({
    filename: "./database.sqlite",
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      membershipId TEXT PRIMARY KEY,
      membershipType INTEGER,
      displayName TEXT,
      bungieName TEXT,
      accessToken TEXT,
      refreshToken TEXT,
      expiresAt INTEGER,
      socials TEXT,
      settings TEXT
    );
  `);

  try { await db.exec("ALTER TABLE users ADD COLUMN settings TEXT"); } catch {}
  try { await db.exec("ALTER TABLE users ADD COLUMN socials TEXT"); } catch {}

  return db;
}

export async function getUserById(membershipId) {
  const db = await getDB();
  return db.get("SELECT * FROM users WHERE membershipId = ?", [membershipId]);
}

export async function updateUserSettings(membershipId, settingsObj) {
  const db = await getDB();
  const settings = JSON.stringify(settingsObj || {});
  await db.run("UPDATE users SET settings = ? WHERE membershipId = ?", [settings, membershipId]);
}

export function parseJSONSafe(str, fallback = {}) {
  try { return str ? JSON.parse(str) : fallback; } catch { return fallback; }
}

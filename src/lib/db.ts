import fs from "node:fs";
import path from "node:path";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const DB_PATH = process.env.SQLITE_PATH || "./data/app.db";

/* ===================== DB INIT ===================== */

const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

let dbPromise;

async function getDb() {
    if (!dbPromise) {
        dbPromise = open({
            filename: DB_PATH,
            driver: sqlite3.Database,
        });

        const db = await dbPromise;

        await db.exec(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS trials_meta (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        active INTEGER NOT NULL DEFAULT 0,
        map_name TEXT,
        map_hash INTEGER,
        map_image TEXT,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS badges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_name TEXT NOT NULL,
        badge_text TEXT NOT NULL,
        icon_url TEXT,
        color TEXT,
        tooltip TEXT,
        badge_class TEXT,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_badges_player
        ON badges(player_name);

      CREATE TABLE IF NOT EXISTS site_settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT NOT NULL
      );
    `);
    }

    return dbPromise;
}

/* ===================== TRIALS ===================== */

export async function setTrialsMeta({
    active,
    map_name,
    map_hash,
    map_image,
}) {
    const db = await getDb();
    const updated_at = new Date().toISOString();

    await db.run(
        `INSERT INTO trials_meta
      (active, map_name, map_hash, map_image, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
        [
            active ? 1 : 0,
            map_name || null,
            map_hash || null,
            map_image || null,
            updated_at,
        ]
    );
}

export async function getLatestTrialsMeta() {
    const db = await getDb();
    return db.get(
        `SELECT *
     FROM trials_meta
     ORDER BY datetime(updated_at) DESC, id DESC
     LIMIT 1`
    );
}

/* ===================== BADGES ===================== */

export async function addBadge({
    player_name,
    badge_text,
    icon_url,
    color,
    tooltip,
    badge_class,
}) {
    const db = await getDb();
    const created_at = new Date().toISOString();

    await db.run(
        `INSERT INTO badges
      (player_name, badge_text, icon_url, color, tooltip, badge_class, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            player_name,
            badge_text,
            icon_url || null,
            color || null,
            tooltip || null,
            badge_class || null,
            created_at,
        ]
    );
}

export async function listBadgesByPlayer(player_name: string) {
  const db = await getDb();

  return db.all(
    `
    SELECT
      badge_text,
      tooltip,
      badge_class
    FROM badges
    WHERE player_name = ?
    ORDER BY
      CASE badge_class
        WHEN 'dev' THEN 1
        WHEN 'advisor' THEN 2
        WHEN 'partner' THEN 3
        ELSE 99
      END,
      datetime(created_at) ASC
    `,
    [player_name]
  );
}

export async function listRecentBadges(limit = 20) {
    const db = await getDb();
    return db.all(
        `SELECT *
     FROM badges
     ORDER BY datetime(created_at) DESC, id DESC
     LIMIT ?`,
        [limit]
    );
}

/* ===================== SITE SETTINGS ===================== */

export async function getSetting(key) {
    const db = await getDb();
    const row = await db.get(
        `SELECT value FROM site_settings WHERE key = ?`,
        [key]
    );
    return row?.value ?? null;
}

export async function setSetting(key, value) {
    const db = await getDb();
    const updated_at = new Date().toISOString();

    await db.run(
        `INSERT INTO site_settings (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key)
     DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        [key, String(value), updated_at]
    );
}
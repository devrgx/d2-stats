import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { openDb, initDb } from "./src/db/index.js";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- API: /stats/:player ---
app.get("/stats/:player", async (req, res) => {
  const { player } = req.params;
  const db = await openDb();
  const row = await db.get("SELECT * FROM players WHERE bungie_name = ?", [player]);
  if (!row) return res.status(404).json({ error: "Player not found" });
  res.json(row);
});

// --- API: /stats/update ---
app.post("/stats/update", async (req, res) => {
  const { bungie_name, membership_id, membership_type, kd, kda, trials_wins, trials_losses } = req.body;
  const db = await openDb();

  await db.run(
    `INSERT INTO players (bungie_name, membership_id, membership_type, kd, kda, trials_wins, trials_losses, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(bungie_name) DO UPDATE SET
       kd = excluded.kd,
       kda = excluded.kda,
       trials_wins = excluded.trials_wins,
       trials_losses = excluded.trials_losses,
       updated_at = datetime('now')`,
    [bungie_name, membership_id, membership_type, kd, kda, trials_wins, trials_losses]
  );

  res.json({ success: true });
});

await initDb();

const PORT = 5100;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));

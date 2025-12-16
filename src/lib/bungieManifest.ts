import fs from "node:fs";
import path from "node:path";

const MANIFEST_PATH = "./data/manifest_pvp_maps.json";
const BUNGIE_MANIFEST_URL =
  "https://www.bungie.net/Platform/Destiny2/Manifest/";
const BUNGIE_API_KEY = process.env.BUNGIE_API_KEY;

type PvPMap = {
  hash: number;
  name: string;
  icon: string | null;
};

/* ===================== LOAD & CACHE ===================== */

async function downloadManifest() {
  if (!BUNGIE_API_KEY) {
    throw new Error("Missing BUNGIE_API_KEY");
  }

  const res = await fetch(BUNGIE_MANIFEST_URL, {
    headers: { "X-API-Key": BUNGIE_API_KEY },
  });

  const data = await res.json();
  const activityPath =
    data.Response.jsonWorldComponentContentPaths.en
      .DestinyActivityDefinition;

  const activityRes = await fetch(
    `https://www.bungie.net${activityPath}`
  );

  const activities = await activityRes.json();

  const pvpMaps: PvPMap[] = [];

  for (const key of Object.keys(activities)) {
    const act = activities[key];

    if (
      act?.isPvP &&
      act?.displayProperties?.name &&
      act?.displayProperties?.icon
    ) {
      pvpMaps.push({
        hash: act.hash,
        name: act.displayProperties.name,
        icon: act.displayProperties.icon,
      });
    }
  }

  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(pvpMaps, null, 2));
}

/* ===================== FIND MAP ===================== */

export async function findPvPMapByName(name: string) {
  if (!fs.existsSync(MANIFEST_PATH)) {
    await downloadManifest();
  }

  const raw = fs.readFileSync(MANIFEST_PATH, "utf-8");
  const maps: PvPMap[] = JSON.parse(raw);

  const lower = name.toLowerCase();

  const match = maps.find(
    (m) => m.name.toLowerCase() === lower
  );

  if (!match) {
    throw new Error(`PvP map not found: ${name}`);
  }

  return {
    map_name: match.name,
    map_hash: match.hash,
    map_image: `https://www.bungie.net${match.icon}`,
  };
}

export async function listPvPMaps() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    await downloadManifest();
  }

  const raw = fs.readFileSync(MANIFEST_PATH, "utf-8");
  const maps: { hash: number; name: string; icon: string | null }[] = JSON.parse(raw);

  // sortiert, damit Autocomplete stabil ist
  return maps.sort((a, b) => a.name.localeCompare(b.name));
}

export async function searchPvPMaps(query: string) {
  const maps = await listPvPMaps();
  const q = query.toLowerCase().trim();

  if (!q) return maps.slice(0, 20);

  return maps
    .filter(m => m.name.toLowerCase().includes(q))
    .slice(0, 20);
}
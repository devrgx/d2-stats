import fs from "node:fs";
import path from "node:path";
import type { BadgeKey } from "../constants/badges";
import { ALL_BADGE_KEYS } from "../constants/badges";

type StoreShape = Record<
  string,
  {
    badges: BadgeKey[];
    updatedAt: string;
    updatedBy: string;
  }
>;

const DATA_PATH = path.resolve(process.cwd(), "data", "userBadges.json");

function ensureFile() {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_PATH)) fs.writeFileSync(DATA_PATH, "{}", "utf-8");
}

function readStore(): StoreShape {
  ensureFile();
  const raw = fs.readFileSync(DATA_PATH, "utf-8").trim() || "{}";
  try {
    return JSON.parse(raw) as StoreShape;
  } catch {
    // If corrupt, keep a backup and reset to prevent crashes
    const backup = `${DATA_PATH}.corrupt-${Date.now()}`;
    fs.writeFileSync(backup, raw, "utf-8");
    fs.writeFileSync(DATA_PATH, "{}", "utf-8");
    return {};
  }
}

function writeStoreAtomic(store: StoreShape) {
  ensureFile();
  const tmp = `${DATA_PATH}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2), "utf-8");
  fs.renameSync(tmp, DATA_PATH);
}

function validateBadges(input: unknown): BadgeKey[] {
  if (!Array.isArray(input)) return [];
  const set = new Set<string>();
  for (const b of input) {
    if (typeof b !== "string") continue;
    if (ALL_BADGE_KEYS.includes(b as BadgeKey)) set.add(b);
  }
  return Array.from(set) as BadgeKey[];
}

export function getUserBadges(membershipId: string): BadgeKey[] {
  const store = readStore();
  const entry = store[membershipId];
  return entry?.badges ?? [];
}

export function setUserBadges(args: {
  membershipId: string;
  badges: unknown;
  updatedBy: string;
}) {
  const store = readStore();
  const normalized = validateBadges(args.badges);

  store[args.membershipId] = {
    badges: normalized,
    updatedAt: new Date().toISOString(),
    updatedBy: args.updatedBy || "unknown",
  };

  writeStoreAtomic(store);
  return store[args.membershipId];
}
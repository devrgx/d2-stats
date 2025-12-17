export type BadgeKey =
  | "developer"
  | "advisor"
  | "third_party"
  | "moderator"
  | "verified";

export type BadgeMeta = {
  label: string;
  description: string;
  color: string;
  /** Icon key used by BadgePill (dependency-free). */
  icon: "code" | "bulb" | "link" | "shield" | "check";
  /** Lower number means higher priority. */
  priority: number;
};

/**
 * Central badge registry.
 * Add new badges here and they automatically appear in the admin panel.
 */
export const BADGES: Record<BadgeKey, BadgeMeta> = {
  developer: {
    label: "Developer",
    description: "Internal developer access / contribution.",
    color: "#ff4d4f",
    icon: "code",
    priority: 1,
  },
  advisor: {
    label: "Advisor",
    description: "Trusted advisor / community support.",
    color: "#4aa3ff",
    icon: "bulb",
    priority: 2,
  },
  third_party: {
    label: "3rd Party",
    description: "Verified third-party integration / partner.",
    color: "#8b5cf6",
    icon: "link",
    priority: 3,
  },
  moderator: {
    label: "Moderator",
    description: "Moderation / staff duties.",
    color: "#22c55e",
    icon: "shield",
    priority: 4,
  },
  verified: {
    label: "Verified",
    description: "Verified identity / creator / notable account.",
    color: "#facc15",
    icon: "check",
    priority: 5,
  },
};

export const ALL_BADGE_KEYS = Object.keys(BADGES) as BadgeKey[];
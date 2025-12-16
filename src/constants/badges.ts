export type BadgeKey =
  | "developer"
  | "advisor"
  | "third_party"
  | "moderator"
  | "verified";

export const BADGES: Record<BadgeKey, {
  label: string;
  color: string;
  icon: string;
  priority: number;
}> = {
  developer: {
    label: "Developer",
    color: "#ff4d4f",
    icon: "code",
    priority: 1,
  },
  advisor: {
    label: "Advisor",
    color: "#4aa3ff",
    icon: "lightbulb",
    priority: 2,
  },
  third_party: {
    label: "3rd Party",
    color: "#8b5cf6",
    icon: "link",
    priority: 3,
  },
  moderator: {
    label: "Moderator",
    color: "#22c55e",
    icon: "shield",
    priority: 4,
  },
  verified: {
    label: "Verified",
    color: "#facc15",
    icon: "check-circle",
    priority: 5,
  },
};
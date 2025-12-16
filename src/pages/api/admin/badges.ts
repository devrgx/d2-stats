import type { APIRoute } from "astro";
import { getUserBadges, setUserBadges } from "../../../server/badgesStore";
import { ALL_BADGE_KEYS } from "../../../constants/badges";

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Admin-Guard (minimal):
 * - erwartet ein Cookie "bungie=" (wie bei dir im Layout)
 * - und darin z.B. user.isAdmin === true
 *
 * Passe das an deinen echten Admin-Check an (z.B. roles, allowlist).
 */
function requireAdmin(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/bungie=([^;]+)/);
  if (!match) return { ok: false as const, adminName: "" };

  try {
    const user = JSON.parse(decodeURIComponent(match[1]));
    if (!user?.isAdmin) return { ok: false as const, adminName: "" };
    return {
      ok: true as const,
      adminName: user?.displayName || user?.name || user?.membershipId || "admin",
    };
  } catch {
    return { ok: false as const, adminName: "" };
  }
}

export const GET: APIRoute = async ({ request, url }) => {
  const guard = requireAdmin(request);
  if (!guard.ok) return json({ error: "Unauthorized" }, 401);

  const membershipId = url.searchParams.get("membershipId")?.trim() ?? "";
  if (!membershipId) return json({ error: "membershipId is required" }, 400);

  const badges = getUserBadges(membershipId);
  return json({ membershipId, badges, allowed: ALL_BADGE_KEYS });
};

export const POST: APIRoute = async ({ request }) => {
  const guard = requireAdmin(request);
  if (!guard.ok) return json({ error: "Unauthorized" }, 401);

  let body: any = null;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const membershipId = String(body?.membershipId ?? "").trim();
  if (!membershipId) return json({ error: "membershipId is required" }, 400);

  const entry = setUserBadges({
    membershipId,
    badges: body?.badges,
    updatedBy: guard.adminName,
  });

  return json({ ok: true, membershipId, ...entry });
};
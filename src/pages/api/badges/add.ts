import type { APIRoute } from "astro";
import { addBadge } from "../../../lib/db.js";

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const payload = {
    player_name: (form.get("player_name") || "").toString().trim(),
    badge_text: (form.get("badge_text") || "").toString().trim(),
    icon_url: (form.get("icon_url") || "").toString().trim() || null,
    color: (form.get("color") || "").toString().trim() || null,
    tooltip: (form.get("tooltip") || "").toString().trim() || null,
    badge_class: (form.get("badge_class") || "").toString().trim() || null,
  };

  if (!payload.player_name || !payload.badge_text) {
    return new Response("Missing fields", { status: 400 });
  }

  await addBadge(payload);
  return redirect("/admin");
};
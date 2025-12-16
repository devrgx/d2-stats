import type { APIRoute } from "astro";
import { addBadge, listRecentBadges } from "../../lib/db";

export const GET: APIRoute = async () => {
    const badges = await listRecentBadges(20);
    return new Response(JSON.stringify(badges), {
        headers: { "Content-Type": "application/json" },
    });
};

export const POST: APIRoute = async ({ request, cookies }) => {
    if (!cookies.get("cc_admin"))
        return new Response("Unauthorized", { status: 403 });

    const form = await request.formData();

    await addBadge({
        player_name: form.get("player_name"),
        badge_text: form.get("badge_text"),
        icon_url: form.get("icon_url"),
        color: form.get("color"),
        tooltip: form.get("tooltip"),
        badge_class: form.get("badge_class"),
    });

    return Response.redirect("/admin?badges=ok", 303);
};
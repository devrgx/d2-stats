import type { APIRoute } from "astro";
import {
    getLatestTrialsMeta,
    setTrialsMeta,
} from "../../lib/db";
import { findPvPMapByName } from "../../lib/bungieManifest";

export const GET: APIRoute = async () => {
    const latest = await getLatestTrialsMeta();
    return new Response(JSON.stringify(latest ?? null), {
        headers: { "Content-Type": "application/json" },
    });
};

export const POST: APIRoute = async ({ request, cookies }) => {
    if (!cookies.get("cc_admin")) {
        return new Response("Unauthorized", { status: 403 });
    }

    const form = await request.formData();
    const active = form.get("active") === "on";
    const mapInput = form.get("map_name");

    if (!mapInput) {
        return new Response("Missing map_name", { status: 400 });
    }

    const map = await findPvPMapByName(String(mapInput));

    await setTrialsMeta({
        active,
        map_name: map.map_name,
        map_hash: map.map_hash,
        map_image: map.map_image,
    });

    return Response.redirect("/admin?trials=ok", 303);
};
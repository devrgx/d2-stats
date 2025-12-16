import type { APIRoute } from "astro";
import { setSetting } from "../../lib/db";

const { ADMIN_TOKEN, NODE_ENV } = process.env;

export const POST: APIRoute = async ({ request, cookies, url }) => {
    const action = url.searchParams.get("action");

    if (action === "login") {
        const form = await request.formData();
        if (form.get("token") !== ADMIN_TOKEN) {
            return new Response("Unauthorized", { status: 401 });
        }

        cookies.set("cc_admin", "1", {
            httpOnly: true,
            secure: NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 8,
        });

        return Response.redirect("/admin", 303);
    }

    if (action === "logout") {
        cookies.delete("cc_admin", { path: "/" });
        return Response.redirect("/admin/login", 303);
    }

    if (action === "settings") {
        if (!cookies.get("cc_admin"))
            return new Response("Forbidden", { status: 403 });

        const form = await request.formData();
        if (form.get("app_version"))
            await setSetting("app_version", form.get("app_version"));
        if (form.get("app_status"))
            await setSetting("app_status", form.get("app_status"));
        if (form.get("discord_invite"))
            await setSetting("discord_invite", form.get("discord_invite"));

        return Response.redirect("/admin?ok=1", 303);
    }

    return new Response("Invalid admin action", { status: 400 });
};
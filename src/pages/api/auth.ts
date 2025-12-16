import type { APIRoute } from "astro";

const {
    BUNGIE_CLIENT_ID,
    BUNGIE_CLIENT_SECRET,
    BUNGIE_REDIRECT_URI,
    BUNGIE_API_KEY,
    NODE_ENV,
} = process.env;

const AUTH_URL = "https://www.bungie.net/en/OAuth/Authorize";
const TOKEN_URL = "https://www.bungie.net/platform/app/oauth/token/";
const USER_URL =
    "https://www.bungie.net/Platform/User/GetMembershipsForCurrentUser/";

export const GET: APIRoute = async ({ request, cookies }) => {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    if (action === "login") {
        return Response.redirect(
            `${AUTH_URL}?client_id=${BUNGIE_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(
                BUNGIE_REDIRECT_URI!
            )}`,
            302
        );
    }

    if (action === "callback") {
        const code = url.searchParams.get("code");
        if (!code) return new Response("Missing code", { status: 400 });

        const tokenRes = await fetch(TOKEN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code,
                client_id: BUNGIE_CLIENT_ID!,
                client_secret: BUNGIE_CLIENT_SECRET!,
                redirect_uri: BUNGIE_REDIRECT_URI!,
            }),
        });

        const token = await tokenRes.json();

        const userRes = await fetch(USER_URL, {
            headers: {
                Authorization: `Bearer ${token.access_token}`,
                "X-API-Key": BUNGIE_API_KEY!,
            },
        });

        const data = await userRes.json();
        const m = data.Response.destinyMemberships[0];

        cookies.set(
            "bungie",
            encodeURIComponent(
                JSON.stringify({
                    membershipId: m.membershipId,
                    membershipType: m.membershipType,
                    displayName: m.displayName,
                })
            ),
            {
                httpOnly: true,
                secure: NODE_ENV === "production",
                sameSite: "lax",
                path: "/",
                maxAge: 60 * 60 * 24 * 30,
            }
        );

        return Response.redirect("/", 302);
    }

    if (action === "logout") {
        cookies.delete("bungie", { path: "/" });
        return Response.redirect("/", 302);
    }

    return new Response("Invalid auth action", { status: 400 });
};
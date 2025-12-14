import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  return new Response(null, {
    status: 302,
    headers: {
      "Set-Cookie": "bungie=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax",
      Location: "/",
    },
  });
};

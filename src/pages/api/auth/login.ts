import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: import.meta.env.BUNGIE_CLIENT_ID,
    response_type: "code",
    redirect_uri: import.meta.env.BUNGIE_REDIRECT_URI,
    state,
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: `https://www.bungie.net/en/OAuth/Authorize?${params.toString()}`,
    },
  });
};

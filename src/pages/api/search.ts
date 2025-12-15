import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request }) => {
  try {
    const { query } = await request.json();

    if (!query || query.length < 2)
      return new Response(JSON.stringify([]), { status: 200 });

    let displayName = query;
    let displayNameCode = null;
    if (query.includes("#")) {
      const [name, code] = query.split("#");
      displayName = name;
      displayNameCode = parseInt(code);
    }

    const res = await fetch(
      "https://www.bungie.net/Platform/Destiny2/SearchDestinyPlayerByBungieName/All/",
      {
        method: "POST",
        headers: {
          "X-API-Key": import.meta.env.BUNGIE_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName, displayNameCode }),
      }
    );

    const data = await res.json();

    const results = (data.Response || []).map((p: any) => ({
      displayName: `${p.bungieGlobalDisplayName}#${p.bungieGlobalDisplayNameCode}`,
      membershipType: p.membershipType,
      membershipId: p.membershipId,
    }));

    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify([]), { status: 500 });
  }
};
import type { APIRoute } from "astro";

type SearchResult = {
  displayName: string;
  membershipType: number;
  membershipId: string;
};

async function runSearch(query: string): Promise<SearchResult[]> {
  const apiKey = import.meta.env.BUNGIE_API_KEY;
  if (!apiKey) return [];

  const q = query.trim();
  if (q.length < 2) return [];

  // === Pfad A: Vollständiger Name (name#code)
  if (q.includes("#")) {
    const [name, rawCode] = q.split("#");
    const code = Number(rawCode);
    if (!name || !Number.isFinite(code)) return [];

    const res = await fetch(
      "https://www.bungie.net/Platform/Destiny2/SearchDestinyPlayerByBungieName/All/",
      {
        method: "POST",
        headers: {
          "X-API-Key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: name,
          displayNameCode: code,
        }),
      }
    );

    const data = await res.json();
    const list = Array.isArray(data?.Response) ? data.Response : [];

    return list.map((p: any) => ({
      displayName: `${p.bungieGlobalDisplayName}#${p.bungieGlobalDisplayNameCode}`,
      membershipType: p.membershipType,
      membershipId: String(p.membershipId),
    }));
  }

  // === Pfad B: Prefix-Suche
  const res = await fetch(
    "https://www.bungie.net/Platform/User/Search/GlobalName/0/",
    {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ displayNamePrefix: q }),
    }
  );

  const data = await res.json();
  const results = Array.isArray(data?.Response?.searchResults)
    ? data.Response.searchResults
    : [];

  const flattened: SearchResult[] = [];

  for (const r of results) {
    const name = `${r.bungieGlobalDisplayName}#${r.bungieGlobalDisplayNameCode}`;
    const memberships = Array.isArray(r.destinyMemberships)
      ? r.destinyMemberships
      : [];

    let pick =
      memberships.find((m: { isCrossSavePrimary: any; }) => m.isCrossSavePrimary)
      || memberships.find((m: { crossSaveOverride: any; membershipType: any; }) => m.crossSaveOverride === m.membershipType)
      || memberships.find((m: { membershipType: number; }) => m.membershipType === 3) // Steam bevorzugen
      || memberships[0];

    if (pick?.membershipId && pick?.membershipType != null) {
      flattened.push({
        displayName: name,
        membershipType: pick.membershipType,
        membershipId: String(pick.membershipId),
      });
    }
  }

  return Array.from(
    new Map(flattened.map((x) => [x.membershipId, x])).values()
  ).slice(0, 10);
}

/* ===================== GET ===================== */
export const GET: APIRoute = async ({ url }) => {
  try {
    const query = url.searchParams.get("q") ?? "";
    const results = await runSearch(query);
    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("search GET error:", err);
    return new Response(JSON.stringify([]), { status: 500 });
  }
};

/* ===================== POST ===================== */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const query = typeof body?.query === "string" ? body.query : "";
    const results = await runSearch(query);
    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("search POST error:", err);
    return new Response(JSON.stringify([]), { status: 500 });
  }
};
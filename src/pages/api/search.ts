import type { APIRoute } from "astro";

/* ============================================================
   Types
============================================================ */

type SearchResult = {
  displayName: string;
  membershipType: number;
  membershipId: string;
};

type BungieEnvelope<T> = {
  Response?: T;
  ErrorCode?: number;
  Message?: string;
  ThrottleSeconds?: number;
};

/* ============================================================
   Helpers
============================================================ */

function getApiKey(): string {
  const key = process.env.BUNGIE_API_KEY ?? import.meta.env.BUNGIE_API_KEY;
  if (!key || !key.trim()) {
    throw new Error("BUNGIE_API_KEY is missing (check .env and restart dev server)");
  }
  return key.trim();
}

async function bungieFetch<T>(
  url: string,
  apiKey: string,
  init: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const data = (await res.json()) as BungieEnvelope<T>;

  if (!res.ok || (typeof data.ErrorCode === "number" && data.ErrorCode !== 1)) {
    throw new Error(
      `Bungie API error (http=${res.status}, code=${data.ErrorCode}): ${data.Message}`
    );
  }

  return data.Response as T;
}

/* ============================================================
   Search Logic
============================================================ */

async function runSearch(query: string): Promise<SearchResult[]> {
  const apiKey = getApiKey();
  const q = query.trim();

  if (q.length < 2) return [];

  /* ---------- Case A: Exact Bungie Name (name#1234) ---------- */
  if (q.includes("#")) {
    const [nameRaw, rawCode] = q.split("#");
    const name = nameRaw?.trim();
    const code = Number(rawCode);

    if (!name || !Number.isFinite(code)) return [];

    const players = await bungieFetch<any[]>(
      "https://www.bungie.net/Platform/Destiny2/SearchDestinyPlayerByBungieName/All/",
      apiKey,
      {
        method: "POST",
        body: JSON.stringify({
          displayName: name,
          displayNameCode: code,
        }),
      }
    );

    return players.map((p) => ({
      displayName: `${p.bungieGlobalDisplayName}#${p.bungieGlobalDisplayNameCode}`,
      membershipType: p.membershipType,
      membershipId: String(p.membershipId),
    }));
  }

  /* ---------- Case B: Prefix Search ---------- */
  const response = await bungieFetch<{ searchResults: any[] }>(
    "https://www.bungie.net/Platform/User/Search/GlobalName/0/",
    apiKey,
    {
      method: "POST",
      body: JSON.stringify({ displayNamePrefix: q }),
    }
  );

  const results = Array.isArray(response.searchResults)
    ? response.searchResults
    : [];

  const flattened: SearchResult[] = [];

  for (const r of results) {
    const displayName = `${r.bungieGlobalDisplayName}#${r.bungieGlobalDisplayNameCode}`;
    const memberships = Array.isArray(r.destinyMemberships)
      ? r.destinyMemberships
      : [];

    const pick =
      memberships.find((m: any) => m.isCrossSavePrimary) ||
      memberships.find((m: any) => m.crossSaveOverride === m.membershipType) ||
      memberships.find((m: any) => m.membershipType === 3) ||
      memberships[0];

    if (pick?.membershipId && pick?.membershipType != null) {
      flattened.push({
        displayName,
        membershipType: pick.membershipType,
        membershipId: String(pick.membershipId),
      });
    }
  }

  // Deduplicate by membershipId
  return Array.from(
    new Map(flattened.map((p) => [p.membershipId, p])).values()
  ).slice(0, 10);
}

/* ============================================================
   GET /api/search?q=...
============================================================ */

export const GET: APIRoute = async ({ url }) => {
  try {
    const query = url.searchParams.get("q") ?? "";
    const results = await runSearch(query);

    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("SEARCH GET ERROR:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

/* ============================================================
   POST /api/search
   body: { query: string }
============================================================ */

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const query = typeof body?.query === "string" ? body.query : "";
    const results = await runSearch(query);

    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("SEARCH POST ERROR:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
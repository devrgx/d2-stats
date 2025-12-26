import type { APIRoute } from "astro";

type BungieEnvelope<T> = {
  Response?: T;
  ErrorCode?: number;
  Message?: string;
  ThrottleSeconds?: number;
};

const emblemDefCache = new Map<number, {
  hash: number | null;
  icon: string | null;
  background: string | null;
}>();

function getApiKey(): string {
  const key = process.env.BUNGIE_API_KEY ?? import.meta.env.BUNGIE_API_KEY;
  if (!key || !key.trim()) {
    throw new Error("BUNGIE_API_KEY fehlt (.env prüfen und Dev-Server neu starten).");
  }
  return key.trim();
}

async function bungieFetch<T>(url: string, apiKey: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "X-API-Key": apiKey,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const data = (await res.json()) as BungieEnvelope<T>;

  if (!res.ok || (typeof data?.ErrorCode === "number" && data.ErrorCode !== 1)) {
    throw new Error(
      `Bungie API error (http=${res.status}, code=${data?.ErrorCode}, throttle=${data?.ThrottleSeconds}): ${data?.Message}`
    );
  }

  return data.Response as T;
}

/**
 * In-Memory Cache (Dev reicht das). Optional später persistieren.
 */
async function resolveEmblemFromHash(apiKey: string, emblemHash: number) {
  if (!Number.isFinite(emblemHash) || emblemHash <= 0) {
    return { hash: null, icon: null, background: null };
  }

  if (emblemDefCache.has(emblemHash)) return emblemDefCache.get(emblemHash);

  const def = await bungieFetch<any>(
    `https://www.bungie.net/Platform/Destiny2/Manifest/DestinyInventoryItemDefinition/${emblemHash}/`,
    apiKey
  );

  const iconPath = def?.displayProperties?.icon ?? null;
  const bgPath = def?.secondarySpecial ?? null; // <- exakt das, was du brauchst

  const resolved = {
    hash: emblemHash,
    icon: iconPath ? `https://www.bungie.net${iconPath}` : null,
    background: bgPath ? `https://www.bungie.net${bgPath}` : null,
  };

  emblemDefCache.set(emblemHash, resolved);
  return resolved;
}

function pickLatestCharacter(charactersData: Record<string, any> | null | undefined) {
  if (!charactersData) return null;
  const chars = Object.values(charactersData);
  if (!chars.length) return null;

  // Charakter mit 최신 dateLastPlayed
  let best = chars[0];
  for (const c of chars) {
    if (!best?.dateLastPlayed) {
      best = c;
      continue;
    }
    if (c?.dateLastPlayed && new Date(c.dateLastPlayed).getTime() > new Date(best.dateLastPlayed).getTime()) {
      best = c;
    }
  }
  return best;
}

/**
 * GET /api/profile?type=3&id=...
 * Liefert:
 * {
 *   ok: true,
 *   profile,              // raw (für deine bestehenden Zugriffe)
 *   clan: { name, tag }?  // geflattet
 *   emblem: { hash, icon, background }  // AUF HASH-BASIS aufgelöst
 * }
 */
export const GET: APIRoute = async ({ url }) => {
  try {
    const membershipType = url.searchParams.get("type");
    const membershipId = url.searchParams.get("id");

    if (!membershipType || !membershipId) {
      return new Response(JSON.stringify({ ok: false, error: "Missing params: type, id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiKey = getApiKey();

    // Profile (100,200 reichen für userInfo + characters)
    const profileUrl =
      `https://www.bungie.net/Platform/Destiny2/${encodeURIComponent(membershipType)}` +
      `/Profile/${encodeURIComponent(membershipId)}/?components=100,200`;

    const profile = await bungieFetch<any>(profileUrl, apiKey);

    // ===== Emblem HASH bestimmen =====
    // Dein Wunsch: Hash nutzen und darüber sauber auflösen.
    // Der Hash hängt am Character (characters.data.*.emblemHash).
    const charactersData = profile?.characters?.data ?? null;
    const latestChar = pickLatestCharacter(charactersData);
    const emblemHash = Number(latestChar?.emblemHash ?? 0) || null;

    const emblem = emblemHash ? await resolveEmblemFromHash(apiKey, emblemHash) : { hash: null, icon: null, background: null };

    // ===== Clan (flatten) =====
    let clan: { name: string; tag?: string } | null = null;
    try {
      const clanUrl =
        `https://www.bungie.net/Platform/GroupV2/User/${encodeURIComponent(membershipType)}` +
        `/${encodeURIComponent(membershipId)}/0/1/`;

      const clanResp = await bungieFetch<any>(clanUrl, apiKey);
      const group = clanResp?.results?.[0]?.group ?? null;

      const name = group?.name ?? null;
      const tag = group?.clanInfo?.clanCallsign ?? null;

      if (name) clan = { name, ...(tag ? { tag } : {}) };
    } catch (e) {
      // Clan ist optional
      clan = null;
    }

    return new Response(JSON.stringify({ ok: true, profile, clan, emblem }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("profile GET error:", err?.message ?? err);
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? "Profile request failed" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
};

import type { APIRoute } from "astro";

type BungieEnvelope<T> = {
  Response?: T;
  ErrorCode?: number;
  Message?: string;
  ThrottleSeconds?: number;
};

function getApiKey(): string {
  const key = process.env.BUNGIE_API_KEY ?? import.meta.env.BUNGIE_API_KEY;
  if (!key || !key.trim()) {
    throw new Error("BUNGIE_API_KEY is missing (check .env and restart dev server)");
  }
  return key.trim();
}

async function bungieFetch<T>(url: string, apiKey: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      "X-API-Key": apiKey,
      Accept: "application/json",
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
 * GET /api/comp?type=3&id=...
 * Returns: { ok, points, progressToNextLevel, nextLevelAt }
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

    const profileUrl =
      `https://www.bungie.net/Platform/Destiny2/${encodeURIComponent(membershipType)}` +
      `/Profile/${encodeURIComponent(membershipId)}/?components=202`;

    const resp = await bungieFetch<any>(profileUrl, apiKey);

    const progressions = resp?.characterProgressions?.data ?? {};
    const firstCharProg = Object.values(progressions)[0] as any;
    const firstProg = firstCharProg?.progressions ?? {};
    const compProg = firstProg["3696598664"];

    const points = compProg?.currentProgress ?? 0;
    const progressToNextLevel = compProg?.progressToNextLevel ?? 0;
    const nextLevelAt = compProg?.nextLevelAt ?? 0;

    return new Response(
      JSON.stringify({
        ok: true,
        points,
        progressToNextLevel,
        nextLevelAt,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("comp GET error:", err?.message ?? err);
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? "Comp failed" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
};

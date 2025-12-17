import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ url }) => {
  const membershipType = url.searchParams.get("type");
  const membershipId = url.searchParams.get("id");

  if (!membershipType || !membershipId) {
    return new Response("Missing params", { status: 400 });
  }

  const apiKey = import.meta.env.BUNGIE_API_KEY;
  if (!apiKey) {
    return new Response("Missing API key", { status: 500 });
  }

  // ===== Profile =====
  const profileRes = await fetch(
    `https://www.bungie.net/Platform/Destiny2/${membershipType}/Profile/${membershipId}/?components=100,200,202,900`,
    { headers: { "X-API-Key": apiKey } }
  );
  const profileData = await profileRes.json();
  const profile = profileData?.Response;

  // ===== Clan =====
  let clan = null;
  try {
    const clanRes = await fetch(
      `https://www.bungie.net/Platform/GroupV2/User/${membershipType}/${membershipId}/0/1`,
      { headers: { "X-API-Key": apiKey } }
    );
    const clanData = await clanRes.json();
    const group = clanData?.Response?.results?.[0]?.group;
    if (group) {
      clan = {
        name: group.name,
        tag: group.clanInfo?.clanCallsign ?? null,
      };
    }
  } catch {}

  // ===== Competitive Progress =====
  let comp = null;
  try {
    const progressions = profile?.characterProgressions?.data ?? {};
    const firstCharProg: any = Object.values(progressions)[0];
    const compProg = firstCharProg?.progressions?.["3696598664"];

    if (compProg) {
      comp = {
        points: compProg.currentProgress ?? 0,
        toNext: compProg.progressToNextLevel ?? 0,
        nextLevelAt: compProg.nextLevelAt ?? 0,
      };
    }
  } catch {}

  // ===== Emblem (FINAL & CORRECT) =====
  let emblemIcon: string | null = null;
  let emblemBackground: string | null = null;

  const chars = profile?.characters?.data
    ? Object.values(profile.characters.data)
    : [];
  const firstChar: any = chars[0];

  // Icon (quadratisch)
  if (firstChar?.emblemPath) {
    emblemIcon = `https://www.bungie.net${firstChar.emblemPath}`;
  }

  // Hintergrund IMMER über Manifest → secondarySpecial
  if (firstChar?.emblemHash) {
    try {
      const manRes = await fetch(
        `https://www.bungie.net/Platform/Destiny2/Manifest/DestinyInventoryItemDefinition/${firstChar.emblemHash}/`,
        { headers: { "X-API-Key": apiKey } }
      );
      const man = await manRes.json();
      const def = man?.Response;

      if (def?.secondarySpecial) {
        emblemBackground = `https://www.bungie.net${def.secondarySpecial}`;
      }
    } catch {}
  }

  // Fallback NUR wenn Manifest nichts liefert
  if (!emblemBackground && firstChar?.emblemBackgroundPath) {
    emblemBackground = `https://www.bungie.net${firstChar.emblemBackgroundPath}`;
  }

  if (!emblemBackground) {
    emblemBackground = "/missing_emblem_special.jpg";
  }

  return new Response(
    JSON.stringify({
      profile,
      clan,
      comp,
      emblem: {
        icon: emblemIcon,
        background: emblemBackground,
      },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
};
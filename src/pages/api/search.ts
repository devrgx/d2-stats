import type { APIRoute } from "astro";

/**
 * POST /api/search
 * Body: { query: string }
 *
 * Verhalten:
 * - Wenn query "name#code" (vollständig), verwende Destiny2/SearchDestinyPlayerByBungieName/All
 * - Sonst Prefix-Suche über User/Search/GlobalName/0/ (liefert Autocomplete)
 *
 * Ausgabe (vereinheitlicht):
 * [
 *   {
 *     displayName: "Name#1234",
 *     membershipType: number,
 *     membershipId: string
 *   }, ...
 * ]
 */

export const POST: APIRoute = async ({ request }) => {
  try {
    const { query } = await request.json();
    const apiKey = import.meta.env.BUNGIE_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing BUNGIE_API_KEY" }), { status: 500 });
    }

    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return new Response(JSON.stringify([]), { status: 200 });
    }

    const q = query.trim();

    // === Pfad A: Vollständiger Bungie-Name mit Code (z. B. "rgx#2117")
    if (q.includes("#")) {
      const [name, rawCode] = q.split("#");
      const code = Number(rawCode);
      if (!name || !Number.isFinite(code)) {
        return new Response(JSON.stringify([]), { status: 200 });
      }

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

      // Diese API gibt direkt Destiny-Profile zurück
      const mapped = list.map((p: any) => ({
        displayName: `${p.bungieGlobalDisplayName}#${p.bungieGlobalDisplayNameCode}`,
        membershipType: p.membershipType,
        membershipId: p.membershipId,
      }));

      return new Response(JSON.stringify(mapped), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // === Pfad B: Prefix-Suche (Autocomplete) via User/Search/GlobalName/0/
    // Doku: POST /User/Search/GlobalName/0/  Body: { displayNamePrefix: string }
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

    // Einträge können mehrere destinyMemberships enthalten: wähle jeweils die passendste (z. B. bevorzugt CrossSavePrimär)
    const flattened: Array<{ displayName: string; membershipType: number; membershipId: string; }> = [];

    for (const r of results) {
      const profileName = `${r?.bungieGlobalDisplayName ?? ""}#${r?.bungieGlobalDisplayNameCode ?? ""}`;
      const memberships: any[] = Array.isArray(r?.destinyMemberships) ? r.destinyMemberships : [];

      // Priorisierung: crossSavePrimary oder – falls nicht gesetzt – der erste Eintrag
      // (Du kannst das später verfeinern, z. B. bevorzugt membershipType 3)
      let pick = memberships.find(m => m.crossSaveOverride && m.crossSaveOverride === m.membershipType)
        || memberships.find(m => m.isCrossSavePrimary)
        || memberships[0];

      if (pick && pick.membershipId && pick.membershipType != null) {
        flattened.push({
          displayName: profileName,
          membershipType: pick.membershipType,
          membershipId: String(pick.membershipId),
        });
      }
    }

    // Duplikate entfernen (gleiche membershipId), optional auf Top-10 begrenzen
    const unique = Array.from(new Map(flattened.map(x => [x.membershipId, x])).values()).slice(0, 10);

    return new Response(JSON.stringify(unique), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("search endpoint error:", err);
    return new Response(JSON.stringify([]), { status: 500 });
  }
};
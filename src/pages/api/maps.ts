import type { APIRoute } from "astro";
import { listPvPMaps, searchPvPMaps } from "../../lib/bungieManifest";

export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams.get("q");

  const data = q
    ? await searchPvPMaps(q)
    : await listPvPMaps();

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
};
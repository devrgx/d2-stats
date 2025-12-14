import type { APIRoute } from "astro";
import { setTrialsMeta } from "../../../lib/db.js";

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const active = form.get("active") === "1";
  const map_name = (form.get("map_name") || "").toString().trim();
  const map_image = (form.get("map_image") || "").toString().trim();

  await setTrialsMeta({ active, map_name, map_image });
  return redirect("/admin");
};
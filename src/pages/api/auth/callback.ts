import type { APIRoute } from "astro";
import { getDB } from "../../../db.js";

export const GET: APIRoute = async ({ url }) => {
  const code = url.searchParams.get("code");
  if (!code) return new Response("Missing code", { status: 400 });

  const tokenRes = await fetch("https://www.bungie.net/Platform/App/OAuth/Token/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(
          `${import.meta.env.BUNGIE_CLIENT_ID}:${import.meta.env.BUNGIE_CLIENT_SECRET}`
        ).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    return new Response("Failed to get access token", { status: 400 });
  }

  const userRes = await fetch(
    "https://www.bungie.net/Platform/User/GetMembershipsForCurrentUser/",
    { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
  );

  const userData = await userRes.json();
  const primary = userData.Response?.destinyMemberships?.[0];
  if (!primary) return new Response("No Destiny membership found", { status: 400 });

  const db = await getDB();
  const membershipId = primary.membershipId;
  const membershipType = primary.membershipType;
  const displayName = primary.displayName;
  const bungieName = `${primary.bungieGlobalDisplayName}#${primary.bungieGlobalDisplayNameCode}`;
  const expiresAt = Date.now() + tokenData.expires_in * 1000;

  await db.run(`
    INSERT INTO users (
      membershipId, membershipType, displayName, bungieName, accessToken, refreshToken, expiresAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(membershipId) DO UPDATE SET
      displayName = excluded.displayName,
      bungieName = excluded.bungieName,
      accessToken = excluded.accessToken,
      refreshToken = excluded.refreshToken,
      expiresAt = excluded.expiresAt;
  `, [
    membershipId,
    membershipType,
    displayName,
    bungieName,
    tokenData.access_token,
    tokenData.refresh_token,
    expiresAt,
  ]);

  const cookie = `bungie=${encodeURIComponent(
    JSON.stringify({ membershipId, displayName })
  )}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;

  return new Response(null, {
    status: 302,
    headers: { "Set-Cookie": cookie, Location: `/profile/${membershipId}` },
  });
};

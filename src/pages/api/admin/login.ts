import type { APIRoute } from "astro";

const ADMIN_COOKIE = "cc_admin";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const token = String(form.get("token") || "");

  if (!token || token !== process.env.ADMIN_TOKEN) {
    return redirect("/admin/login?error=1");
  }

  cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    path: "/",
    sameSite: "strict",
    secure: true,
    maxAge: 60 * 60 * 24 * 7, // 7 Tage
  });

  return redirect("/admin");
};

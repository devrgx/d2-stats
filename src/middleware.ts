import type { MiddlewareHandler } from "astro";

const ADMIN_COOKIE = "cc_admin";

export const onRequest: MiddlewareHandler = async (context, next) => {
  const url = new URL(context.request.url);
  const isAdminArea =
    url.pathname.startsWith("/admin") || url.pathname.startsWith("/api/admin");

  if (!isAdminArea) return next();

  const token = context.cookies.get(ADMIN_COOKIE)?.value;
  if (token && token === process.env.ADMIN_TOKEN) {
    return next();
  }

  // erlaubt: Login-Seite & Login-POST
  if (url.pathname === "/admin/login" || url.pathname === "/api/admin/login") {
    return next();
  }

  return context.redirect("/admin/login");
};
// Shared-password auth for /content and /api/admin/* across the Arkadya clone
// fleet. A single ADMIN_PASSWORD env (shared, set per Cloudflare Pages project)
// gates the CMS. Logging in (POST /api/admin/login) sets an HttpOnly cookie
// whose value is an HMAC derived from the password; getAdminUser verifies it.
//
// Local dev (NODE_ENV !== "production") bypasses to a dev identity so the admin
// UI is usable via `pnpm dev`. Runs on the edge runtime — uses Web Crypto only.

export interface AdminUser {
  email: string;
}

export const ADMIN_COOKIE = "arkadya_admin";
const SESSION_MSG = "arkadya-admin-session-v1";

export async function sessionToken(password: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(SESSION_MSG));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
}

export async function getAdminUser(headers: Headers): Promise<AdminUser | null> {
  if (process.env.NODE_ENV !== "production") {
    return { email: "dev@local" };
  }

  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    console.error("ADMIN_PASSWORD not set — CMS is locked. Set it in Cloudflare Pages env.");
    return null;
  }

  const cookie = readCookie(headers.get("cookie"), ADMIN_COOKIE);
  if (!cookie) return null;

  const expected = await sessionToken(password);
  if (!timingSafeEqual(cookie, expected)) return null;

  return { email: "admin@arkadya.tech" };
}

export async function requireAdmin(): Promise<AdminUser> {
  const { headers } = await import("next/headers");
  const user = await getAdminUser(await headers());
  if (!user) {
    const { redirect } = await import("next/navigation");
    redirect("/admin-login");
    throw new Error("unreachable");
  }
  return user;
}

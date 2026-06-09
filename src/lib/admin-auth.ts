// Authentication for /content/* and /api/admin/*.
//
// Production: Cloudflare Access sits in front, blocks unauthenticated
// traffic, and injects `cf-access-jwt-assertion` + `cf-access-authenticated-user-email`
// headers. We verify the JWT against the CF Access JWKS for the team to
// confirm authenticity, then read the email claim.
//
// Local dev: no CF Access running. We fall back to a fake "dev@local"
// identity so the admin UI is usable via `pnpm dev`.

import { jwtVerify, createRemoteJWKSet, type JWTVerifyResult } from "jose";

export interface AdminUser {
  email: string;
}

let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;
let cachedTeamDomain: string | null = null;

function getJwks(teamDomain: string): ReturnType<typeof createRemoteJWKSet> {
  if (jwksCache && cachedTeamDomain === teamDomain) return jwksCache;
  cachedTeamDomain = teamDomain;
  jwksCache = createRemoteJWKSet(
    new URL(`https://${teamDomain}.cloudflareaccess.com/cdn-cgi/access/certs`)
  );
  return jwksCache;
}

export async function getAdminUser(headers: Headers): Promise<AdminUser | null> {
  // Local-dev bypass: CF Access doesn't run under `next dev`, so we'd never
  // be able to use the admin UI otherwise. Production builds set
  // NODE_ENV=production automatically.
  if (process.env.NODE_ENV !== "production") {
    return { email: "dev@local" };
  }

  const token = headers.get("cf-access-jwt-assertion");
  if (!token) return null;

  const teamDomain = process.env.CF_ACCESS_TEAM_DOMAIN;
  const audience = process.env.CF_ACCESS_AUD;
  if (!teamDomain || !audience) {
    console.error(
      "CF Access env missing: set CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD in Cloudflare Pages env."
    );
    return null;
  }

  let result: JWTVerifyResult;
  try {
    result = await jwtVerify(token, getJwks(teamDomain), {
      issuer: `https://${teamDomain}.cloudflareaccess.com`,
      audience,
    });
  } catch (err) {
    console.error("CF Access JWT verification failed:", err);
    return null;
  }

  const email = typeof result.payload.email === "string" ? result.payload.email : null;
  if (!email) return null;
  return { email };
}

// Convenience for server components — reads from next/headers().
export async function requireAdmin(): Promise<AdminUser> {
  const { headers } = await import("next/headers");
  const hdrs = await headers();
  const user = await getAdminUser(hdrs);
  if (!user) {
    // Redirect to root so a hostile bypass doesn't hit edit UI.
    const { redirect } = await import("next/navigation");
    redirect("/");
    // redirect() throws — narrows TS by the time we get past it, but the
    // dynamic import obscures the return type, so make it explicit:
    throw new Error("unreachable");
  }
  return user;
}

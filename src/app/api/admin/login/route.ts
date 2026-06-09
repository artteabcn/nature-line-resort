import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, sessionToken, timingSafeEqual } from "@/lib/admin-auth";

// POST { password } → if it matches ADMIN_PASSWORD, set the HttpOnly session
// cookie. DELETE → clear it (logout). Not gated by getAdminUser (it grants auth).
export async function POST(req: NextRequest): Promise<NextResponse> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    return NextResponse.json({ error: "Admin password not configured" }, { status: 500 });
  }

  let body: { password?: unknown };
  try {
    body = (await req.json()) as { password?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const candidate = typeof body.password === "string" ? body.password : "";
  if (!candidate || !timingSafeEqual(candidate, password)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await sessionToken(password), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

export async function DELETE(): Promise<NextResponse> {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/admin-auth";
import { getAllSiteConfig, setSiteConfig } from "@/lib/content";

const ALLOWED_KEYS = [
  "facebookUrl",
  "instagramUrl",
  "mapEmbedUrl",
  "googlePlaceId",
  "min_stay",
  "cutoff_hour",
] as const;

const BodySchema = z.object({
  changes: z
    .array(
      z.object({
        key: z.enum(ALLOWED_KEYS),
        value: z.string().max(2000),
      })
    )
    .min(1)
    .max(20),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await getAdminUser(req.headers);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await getAllSiteConfig();
  const data = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getAdminUser(req.headers);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    for (const { key, value } of parsed.data.changes) {
      await setSiteConfig(key, value, user.email);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: parsed.data.changes.length });
}

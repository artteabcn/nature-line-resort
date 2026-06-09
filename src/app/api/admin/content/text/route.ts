import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/admin-auth";
import { upsertOverride, deleteOverride } from "@/lib/content";

const ChangeSchema = z.object({
  path: z.string().min(1).max(200),
  locale: z.enum(["en", "fr", "de", "th"]),
  value: z.string().max(8000),
});

const BodySchema = z.object({
  changes: z.array(ChangeSchema).min(1).max(200),
});

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

  // Apply changes serially so D1 doesn't accumulate parallel writes.
  // Empty string means "remove the override" (revert to JSON default).
  for (const change of parsed.data.changes) {
    if (change.value.length === 0) {
      await deleteOverride(change.locale, change.path);
    } else {
      await upsertOverride(change.locale, change.path, change.value, user.email);
    }
  }

  return NextResponse.json({ ok: true, count: parsed.data.changes.length });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/admin-auth";
import { blockDate, unblockDate } from "@/lib/availability";

const BodySchema = z.object({
  action: z.enum(["block", "unblock"]),
  roomId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().optional(),
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

  const { action, roomId, date, reason } = parsed.data;
  try {
    if (action === "block") {
      await blockDate(roomId, date, reason);
    } else {
      await unblockDate(roomId, date);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { ROOMS } from "@/config/rooms";
import { getUnavailableDates, isSameDayCutoffPassed } from "@/lib/availability";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const roomId = req.nextUrl.searchParams.get("room");
  if (!roomId) {
    return NextResponse.json({ error: "room parameter required" }, { status: 400 });
  }
  const room = ROOMS.find((r) => r.id === roomId);
  if (!room) {
    return NextResponse.json({ error: "Unknown room" }, { status: 404 });
  }

  try {
    const [unavailable, cutoffPassed] = await Promise.all([
      getUnavailableDates(roomId),
      isSameDayCutoffPassed(),
    ]);

    if (cutoffPassed) {
      const today = new Date().toISOString().slice(0, 10);
      if (!unavailable.includes(today)) {
        unavailable.push(today);
        unavailable.sort();
      }
    }

    return NextResponse.json({ unavailable });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("Availability route error", detail);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

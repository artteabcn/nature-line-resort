import { NextRequest, NextResponse } from "next/server";
import { AvailabilitySchema } from "@/lib/validations/availability";
import { getAccessToken, getCalendar, Beds24Error } from "@/lib/beds24";
import type { DayCalendar } from "@/lib/beds24";
import { BEDS24_PROPERTY_ID, BEDS24_ROOM_IDS, BEDS24_TO_ROOM_ID } from "@/config/beds24";

interface AvailableRoom {
  beds24RoomId: number;
  roomId: string | null;
  totalPrice: number | null;
  currency: string;
  nights: number;
}

function nightDates(arrival: string, departure: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${arrival}T00:00:00Z`);
  const end = new Date(`${departure}T00:00:00Z`);
  while (cursor < end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!BEDS24_PROPERTY_ID) {
    return NextResponse.json({
      available: [],
      nights: 0,
      minStayRequired: 1,
      notConfigured: true,
    });
  }

  try {
    const body: unknown = await req.json();
    const parsed = AvailabilitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { arrival, departure } = parsed.data;
    const nights = nightDates(arrival, departure);
    const arrivalDate = nights[0];

    const token = await getAccessToken();
    const calendar = await getCalendar({
      token,
      roomIds: BEDS24_ROOM_IDS,
      startDate: arrival,
      endDate: departure,
    });

    const available: AvailableRoom[] = [];
    let minStayRequired = Infinity;

    for (const id of BEDS24_ROOM_IDS) {
      const daily = calendar[String(id)] ?? {};
      const arrivalDay: DayCalendar = daily[arrivalDate] ?? {};
      if (typeof arrivalDay.minStay === "number" && arrivalDay.minStay > 0) {
        minStayRequired = Math.min(minStayRequired, arrivalDay.minStay);
      }
      const nightlyData: DayCalendar[] = nights.map((d) => daily[d] ?? {});
      const allAvailable = nightlyData.every((d) => d.available === 1);
      if (!allAvailable) continue;
      const total = nightlyData.reduce((sum, d) => sum + (d.price1 ?? 0), 0);
      available.push({
        beds24RoomId: id,
        roomId: BEDS24_TO_ROOM_ID[id] ?? null,
        totalPrice: total > 0 ? total : null,
        currency: "THB",
        nights: nights.length,
      });
    }

    return NextResponse.json({
      available,
      nights: nights.length,
      minStayRequired: Number.isFinite(minStayRequired) ? minStayRequired : 1,
    });
  } catch (err) {
    if (err instanceof Beds24Error) {
      console.error("Beds24 availability error", err.status, err.body);
      return NextResponse.json(
        { error: "Beds24 API error", beds24Status: err.status },
        { status: 502 }
      );
    }
    console.error("Availability route error", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Internal error", detail }, { status: 500 });
  }
}

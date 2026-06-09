import { NextRequest, NextResponse } from "next/server";
import { AvailabilitySchema } from "@/lib/validations/availability";
import { getRates, SmoobuError } from "@/lib/smoobu";
import type { DailyRate } from "@/lib/smoobu";
import { SMOOBU_APARTMENT_IDS, APARTMENT_TO_ROOM_ID } from "@/config/smoobu";

interface AvailableApartment {
  apartmentId: number;
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
  try {
    const body: unknown = await req.json();
    const parsed = AvailabilitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { arrival, departure } = parsed.data;
    const apartmentIds = [...SMOOBU_APARTMENT_IDS];
    const nights = nightDates(arrival, departure);

    // Smoobu's /booking/checkApartmentAvailability requires a real customerId
    // we don't have for anonymous visitors, so we derive availability from
    // /rates instead — the rates payload gives us `available` (0|1) and
    // `price` per night per apartment in a single call.
    const rates = await getRates({
      apartmentIds,
      startDate: arrival,
      endDate: departure,
    });

    const arrivalDate = nights[0];
    const available: AvailableApartment[] = [];
    // Smallest min-length-of-stay required to book *any* apartment on the
    // arrival date, read live from Smoobu rather than hardcoded so seasonal
    // changes to the rule surface automatically. Defaults to 1 night.
    let minStayRequired = Infinity;
    for (const id of apartmentIds) {
      const daily = rates[String(id)] ?? {};
      const arrivalMinStay = daily[arrivalDate]?.min_length_of_stay;
      if (typeof arrivalMinStay === "number" && arrivalMinStay > 0) {
        minStayRequired = Math.min(minStayRequired, arrivalMinStay);
      }
      const nightlyRates: DailyRate[] = nights.map((d) => daily[d] ?? {});
      const allAvailable = nightlyRates.every((r) => r.available === 1);
      if (!allAvailable) continue;
      const total = nightlyRates.reduce((sum, r) => sum + (r.price ?? 0), 0);
      available.push({
        apartmentId: id,
        roomId: APARTMENT_TO_ROOM_ID[id] ?? null,
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
    if (err instanceof SmoobuError) {
      console.error("Smoobu availability error", err.status, err.body);
      return NextResponse.json(
        { error: "Smoobu API error", smoobuStatus: err.status, smoobuBody: err.body },
        { status: 502 }
      );
    }
    console.error("Availability route error", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Internal error", detail }, { status: 500 });
  }
}

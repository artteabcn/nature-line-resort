import { NextRequest, NextResponse } from "next/server";
import { PaymentIntentSchema, type PaymentIntentInput } from "@/lib/validations/payment-intent";
import { getAccessToken, getCalendar, Beds24Error } from "@/lib/beds24";
import type { DayCalendar } from "@/lib/beds24";
import { BEDS24_PROPERTY_ID, BEDS24_ROOM_IDS } from "@/config/beds24";
import { createPaymentIntent } from "@/lib/stripe";
import { getDbOrNull } from "@/lib/db/get-db";
import { bookings } from "@/db/schema";
import { DEPOSIT_PERCENT, depositAmount, balanceDue } from "@/config/payments";

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

async function priceQuote(
  beds24RoomId: number,
  checkIn: string,
  checkOut: string
): Promise<{ totalThb: number } | { error: string }> {
  if (!BEDS24_ROOM_IDS.includes(beds24RoomId)) return { error: "Unknown room" };
  const token = await getAccessToken();
  const calendar = await getCalendar({
    token,
    roomIds: [beds24RoomId],
    startDate: checkIn,
    endDate: checkOut,
  });
  const daily = calendar[String(beds24RoomId)] ?? {};
  const nightly: DayCalendar[] = nightDates(checkIn, checkOut).map((d) => daily[d] ?? {});
  if (nightly.length === 0) return { error: "Empty stay" };
  if (!nightly.every((d) => d.available === 1)) return { error: "Room unavailable" };
  const total = nightly.reduce((sum, d) => sum + (d.price1 ?? 0), 0);
  if (total <= 0) return { error: "Could not price stay" };
  return { totalThb: Math.round(total) };
}

async function insertPending(
  data: PaymentIntentInput,
  totalThb: number,
  depositThb: number,
  paymentIntentId: string
): Promise<number | null> {
  const db = await getDbOrNull();
  if (!db) return null;
  const guests = data.adults + data.children;
  const result = await db
    .insert(bookings)
    .values({
      name: data.name,
      email: data.email,
      phone: data.phone,
      roomId: data.roomId,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      guests,
      notes: data.notes,
      beds24RoomId: data.beds24RoomId,
      totalPrice: totalThb,
      currency: "THB",
      paymentStatus: "pending",
      stripePaymentIntentId: paymentIntentId,
      amountPaid: depositThb,
      locale: data.locale,
    })
    .returning({ id: bookings.id });
  return result[0]?.id ?? null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!BEDS24_PROPERTY_ID) {
    return NextResponse.json({ error: "booking_not_configured" }, { status: 503 });
  }

  let parsed: PaymentIntentInput;
  try {
    const body: unknown = await req.json();
    const result = PaymentIntentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    parsed = result.data;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let totalThb: number;
  try {
    const quote = await priceQuote(parsed.beds24RoomId, parsed.checkIn, parsed.checkOut);
    if ("error" in quote) {
      return NextResponse.json({ error: quote.error }, { status: 409 });
    }
    totalThb = quote.totalThb;
  } catch (err) {
    if (err instanceof Beds24Error) {
      return NextResponse.json(
        { error: "Beds24 API error", beds24Status: err.status },
        { status: 502 }
      );
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  const depositThb = depositAmount(totalThb);
  const balanceThb = balanceDue(totalThb);
  const amountSatang = depositThb * 100;

  let intent;
  try {
    intent = await createPaymentIntent({
      amount: amountSatang,
      currency: "thb",
      receiptEmail: parsed.email,
      description: `${DEPOSIT_PERCENT}% non-refundable deposit — Baan Thong Ching Resort`,
      metadata: {
        beds24RoomId: String(parsed.beds24RoomId),
        roomId: parsed.roomId,
        checkIn: parsed.checkIn,
        checkOut: parsed.checkOut,
        guestEmail: parsed.email,
        guestName: parsed.name,
        locale: parsed.locale,
        chargeModel: `deposit_${DEPOSIT_PERCENT}`,
        fullPriceThb: String(totalThb),
        depositThb: String(depositThb),
        balanceDueThb: String(balanceThb),
      },
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("Stripe createPaymentIntent failed:", detail);
    return NextResponse.json({ error: "Payment setup failed" }, { status: 502 });
  }

  if (!intent.client_secret) {
    return NextResponse.json({ error: "Missing client_secret" }, { status: 502 });
  }

  const bookingId = await insertPending(parsed, totalThb, depositThb, intent.id);

  return NextResponse.json({
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
    bookingId,
    depositAmount: depositThb,
    balanceDue: balanceThb,
    totalAmount: totalThb,
    depositPercent: DEPOSIT_PERCENT,
    currency: "THB",
  });
}

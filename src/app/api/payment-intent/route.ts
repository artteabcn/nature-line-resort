import { NextRequest, NextResponse } from "next/server";
import { PaymentIntentSchema, type PaymentIntentInput } from "@/lib/validations/payment-intent";
import { getRates, SmoobuError } from "@/lib/smoobu";
import type { DailyRate } from "@/lib/smoobu";
import { SMOOBU_APARTMENT_IDS, SMOOBU_CHANNEL_ID_DIRECT_WEBSITE } from "@/config/smoobu";
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
  apartmentId: number,
  checkIn: string,
  checkOut: string
): Promise<{ totalThb: number } | { error: string }> {
  if (!SMOOBU_APARTMENT_IDS.includes(apartmentId as (typeof SMOOBU_APARTMENT_IDS)[number])) {
    return { error: "Unknown apartment" };
  }
  const rates = await getRates({
    apartmentIds: [apartmentId],
    startDate: checkIn,
    endDate: checkOut,
  });
  const daily = rates[String(apartmentId)] ?? {};
  const nightly: DailyRate[] = nightDates(checkIn, checkOut).map((d) => daily[d] ?? {});
  if (nightly.length === 0) return { error: "Empty stay" };
  if (!nightly.every((r) => r.available === 1)) return { error: "Apartment unavailable" };
  const total = nightly.reduce((sum, r) => sum + (r.price ?? 0), 0);
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
      smoobuApartmentId: data.apartmentId,
      channelId: SMOOBU_CHANNEL_ID_DIRECT_WEBSITE,
      totalPrice: totalThb,
      currency: "THB",
      paymentStatus: "pending",
      stripePaymentIntentId: paymentIntentId,
      // amountPaid is recorded at capture time; the deposit amount lives in
      // the Stripe intent itself (intent.amount) and in this column once
      // captured by /api/booking.
      amountPaid: depositThb,
      locale: data.locale,
    })
    .returning({ id: bookings.id });
  return result[0]?.id ?? null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
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
    const quote = await priceQuote(parsed.apartmentId, parsed.checkIn, parsed.checkOut);
    if ("error" in quote) {
      return NextResponse.json({ error: quote.error }, { status: 409 });
    }
    totalThb = quote.totalThb;
  } catch (err) {
    if (err instanceof SmoobuError) {
      return NextResponse.json(
        { error: "Smoobu API error", smoobuStatus: err.status },
        { status: 502 }
      );
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  const depositThb = depositAmount(totalThb);
  const balanceThb = balanceDue(totalThb);
  // THB has 2 decimal places in Stripe (smallest unit = satang).
  const amountSatang = depositThb * 100;

  let intent;
  try {
    intent = await createPaymentIntent({
      amount: amountSatang,
      currency: "thb",
      receiptEmail: parsed.email,
      description: `${DEPOSIT_PERCENT}% non-refundable deposit — Nature Line Resort`,
      metadata: {
        apartmentId: String(parsed.apartmentId),
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

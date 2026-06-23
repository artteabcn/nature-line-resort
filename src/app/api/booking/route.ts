import { NextRequest, NextResponse } from "next/server";
import { BookingSchema, type BookingInput } from "@/lib/validations/booking";
import { getDbOrNull } from "@/lib/db/get-db";
import { bookings } from "@/db/schema";
import { getRoomById } from "@/config/rooms";
import { isAvailable, isSameDayCutoffPassed } from "@/lib/availability";
import { getSiteConfig } from "@/lib/content";
import { createPaymentIntent } from "@/lib/stripe";
import { commissionAmount, ownerPayout } from "@/config/payments";

function nightCount(checkIn: string, checkOut: string): number {
  const ms =
    new Date(`${checkOut}T00:00:00Z`).getTime() - new Date(`${checkIn}T00:00:00Z`).getTime();
  return Math.round(ms / 86_400_000);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let parsed: BookingInput;
  try {
    const body: unknown = await req.json();
    const result = BookingSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input", details: result.error.flatten() },
        { status: 400 }
      );
    }
    parsed = result.data;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const room = getRoomById(parsed.roomId);
  if (!room) {
    return NextResponse.json({ error: "Unknown room" }, { status: 400 });
  }

  const nights = nightCount(parsed.checkIn, parsed.checkOut);
  if (nights <= 0) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  const [config, available, cutoff] = await Promise.all([
    getSiteConfig(),
    isAvailable(parsed.roomId, parsed.checkIn, parsed.checkOut),
    isSameDayCutoffPassed(),
  ]);

  if (cutoff && parsed.checkIn === new Date().toISOString().slice(0, 10)) {
    return NextResponse.json({ error: "Same-day booking cutoff has passed" }, { status: 422 });
  }

  if (nights < config.minStay) {
    return NextResponse.json(
      { error: `Minimum stay is ${config.minStay} nights`, minStay: config.minStay },
      { status: 422 }
    );
  }

  if (!available) {
    return NextResponse.json({ error: "Room not available for selected dates" }, { status: 409 });
  }

  const totalThb = room.priceThb * nights;
  const arkadyaFee = commissionAmount(totalThb);
  const ownerPayoutThb = ownerPayout(totalThb);
  const amountSatang = totalThb * 100;

  let intent;
  try {
    intent = await createPaymentIntent({
      amount: amountSatang,
      currency: "thb",
      receiptEmail: parsed.guestEmail,
      description: `Benjyland Beach Guesthouse — ${room.id} — ${parsed.checkIn} to ${parsed.checkOut}`,
      metadata: {
        clone_id: "nature-line-resort",
        roomId: parsed.roomId,
        checkIn: parsed.checkIn,
        checkOut: parsed.checkOut,
        guestEmail: parsed.guestEmail,
        guestName: parsed.guestName,
        locale: parsed.locale,
        totalThb: String(totalThb),
        arkadyaFee: String(arkadyaFee),
        ownerPayout: String(ownerPayoutThb),
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

  const db = await getDbOrNull();
  let bookingId: number | null = null;
  if (db) {
    try {
      const result = await db
        .insert(bookings)
        .values({
          name: parsed.guestName,
          email: parsed.guestEmail,
          phone: parsed.guestPhone,
          roomId: parsed.roomId,
          checkIn: parsed.checkIn,
          checkOut: parsed.checkOut,
          guests: parsed.guests,
          notes: parsed.notes,
          totalPrice: totalThb,
          currency: "THB",
          paymentStatus: "pending",
          stripePaymentIntentId: intent.id,
          amountPaid: 0,
          locale: parsed.locale,
          arkadyaFeeThb: arkadyaFee,
          ownerPayoutThb,
        })
        .returning({ id: bookings.id });
      bookingId = result[0]?.id ?? null;
    } catch (err) {
      console.error("Failed to insert pending booking:", err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json({
    clientSecret: intent.client_secret,
    bookingId,
    totalThb,
    arkadyaFee,
    ownerPayout: ownerPayoutThb,
  });
}

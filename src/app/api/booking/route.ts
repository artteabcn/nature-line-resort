import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { BookingSchema, type BookingInput } from "@/lib/validations/booking";
import { sendOwnerEmail, bookingOwnerEmail } from "@/lib/owner-email";
import { sendBookingConfirmation } from "@/lib/guest-email";
import { getAccessToken, createBooking, Beds24Error } from "@/lib/beds24";
import { BEDS24_PROPERTY_ID, ROOM_TO_BEDS24_ID, BEDS24_SOURCE_ID_DIRECT } from "@/config/beds24";
import { getDbOrNull } from "@/lib/db/get-db";
import { bookings } from "@/db/schema";
import { retrievePaymentIntent, capturePaymentIntent, cancelPaymentIntent } from "@/lib/stripe";
import type { Stripe } from "@/lib/stripe";

function splitName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

async function updateBooking(
  bookingId: number,
  patch: Partial<typeof bookings.$inferInsert>
): Promise<void> {
  const db = await getDbOrNull();
  if (!db) return;
  await db
    .update(bookings)
    .set({ ...patch, updatedAt: new Date().toISOString() })
    .where(eq(bookings.id, bookingId));
}

function intentMatchesBooking(intent: Stripe.PaymentIntent, parsed: BookingInput): boolean {
  const meta = intent.metadata ?? {};
  const beds24RoomId = parsed.beds24RoomId ?? ROOM_TO_BEDS24_ID[parsed.roomId];
  if (!beds24RoomId) return false;
  if (meta.beds24RoomId !== String(beds24RoomId)) return false;
  if (meta.checkIn !== parsed.checkIn || meta.checkOut !== parsed.checkOut) return false;
  if (meta.guestEmail && meta.guestEmail.toLowerCase() !== parsed.email.toLowerCase()) {
    return false;
  }
  return true;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!BEDS24_PROPERTY_ID) {
    return NextResponse.json({ error: "booking_not_configured" }, { status: 503 });
  }

  let parsed: BookingInput;
  try {
    const body: unknown = await req.json();
    const result = BookingSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    parsed = result.data;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const beds24RoomId = parsed.beds24RoomId ?? ROOM_TO_BEDS24_ID[parsed.roomId];
  if (!beds24RoomId) {
    return NextResponse.json({ error: "Unknown room" }, { status: 400 });
  }

  let intent: Stripe.PaymentIntent;
  try {
    intent = await retrievePaymentIntent(parsed.paymentIntentId);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("Stripe retrieve failed:", detail);
    return NextResponse.json({ error: "Payment not found" }, { status: 400 });
  }

  if (intent.status !== "requires_capture") {
    return NextResponse.json(
      { error: "Payment not authorized", paymentStatus: intent.status },
      { status: 409 }
    );
  }

  if (!intentMatchesBooking(intent, parsed)) {
    return NextResponse.json({ error: "Payment / booking mismatch" }, { status: 400 });
  }

  const totalThb =
    parsed.totalPrice ?? Number(intent.metadata?.fullPriceThb ?? Math.round(intent.amount / 100));
  const depositThb = Math.round(intent.amount / 100);
  const balanceThb = Math.max(0, totalThb - depositThb);
  const localId = parsed.bookingId ?? null;

  let beds24BookingId: number | undefined;
  let token: string;
  try {
    token = await getAccessToken();
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("Beds24 token error:", detail);
    return NextResponse.json({ error: "Reservation system unavailable" }, { status: 502 });
  }

  try {
    const { firstName, lastName } = splitName(parsed.name);
    const reservation = await createBooking(token, {
      propertyId: BEDS24_PROPERTY_ID,
      roomId: beds24RoomId,
      arrival: parsed.checkIn,
      departure: parsed.checkOut,
      numAdult: parsed.adults,
      numChild: parsed.children,
      firstName,
      lastName,
      email: parsed.email,
      phone: parsed.phone,
      price: totalThb,
      message: parsed.notes,
      apiSourceId: BEDS24_SOURCE_ID_DIRECT,
    });
    beds24BookingId = reservation.id;
  } catch (err) {
    try {
      await cancelPaymentIntent(parsed.paymentIntentId, "abandoned");
    } catch (cancelErr) {
      console.error(
        "Stripe cancel after Beds24 failure also failed:",
        cancelErr instanceof Error ? cancelErr.message : cancelErr
      );
    }
    if (localId !== null) {
      await updateBooking(localId, { status: "failed", paymentStatus: "failed" });
    }
    if (err instanceof Beds24Error) {
      return NextResponse.json(
        { error: "Reservation could not be created", status: err.status },
        { status: 502 }
      );
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  let captured: Stripe.PaymentIntent | null = null;
  try {
    captured = await capturePaymentIntent(parsed.paymentIntentId);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("Stripe capture failed after Beds24 reservation:", detail);
    if (localId !== null) {
      await updateBooking(localId, {
        status: "confirmed",
        paymentStatus: "authorized",
        beds24BookingId,
      });
    }
    return NextResponse.json(
      {
        error: "Payment hold could not be captured — booking saved, our team will follow up",
        reservationId: beds24BookingId,
        bookingId: localId,
      },
      { status: 202 }
    );
  }

  const capturedThb = Math.round((captured.amount_received ?? captured.amount) / 100);

  if (localId !== null) {
    await updateBooking(localId, {
      status: "confirmed",
      paymentStatus: "paid",
      beds24BookingId,
      amountPaid: capturedThb,
    });
  }

  const ROOM_LABELS: Record<string, string> = {
    cosy: "Cosy Room",
    deluxe: "Deluxe Room",
    family: "Family Room",
  };
  const roomName = ROOM_LABELS[parsed.roomId] ?? parsed.roomId;
  const guests = parsed.adults + parsed.children;

  const [ownerResult, guestResult] = await Promise.allSettled([
    sendOwnerEmail(
      bookingOwnerEmail({
        name: parsed.name,
        email: parsed.email,
        phone: parsed.phone,
        room: roomName,
        checkIn: parsed.checkIn,
        checkOut: parsed.checkOut,
        guests,
        notes: parsed.notes,
        totalPrice: totalThb,
        depositPaid: capturedThb,
        balanceDue: balanceThb,
        reservationId: beds24BookingId,
      })
    ),
    sendBookingConfirmation({
      to: parsed.email,
      name: parsed.name,
      roomId: parsed.roomId,
      checkIn: parsed.checkIn,
      checkOut: parsed.checkOut,
      guests,
      totalPrice: totalThb,
      depositPaid: capturedThb,
      balanceDue: balanceThb,
      reservationId: beds24BookingId,
      locale: parsed.locale,
    }),
  ]);

  const warnings: { ownerEmail?: string; guestEmail?: string } = {};
  if (ownerResult.status === "rejected") {
    const reason =
      ownerResult.reason instanceof Error ? ownerResult.reason.message : String(ownerResult.reason);
    console.error("Owner notification email failed:", reason);
    warnings.ownerEmail = reason;
  }
  if (guestResult.status === "rejected") {
    const reason =
      guestResult.reason instanceof Error ? guestResult.reason.message : String(guestResult.reason);
    console.error("Guest confirmation email failed:", reason);
    warnings.guestEmail = reason;
  }

  return NextResponse.json({
    ok: true,
    reservationId: beds24BookingId,
    bookingId: localId,
    paymentStatus: "paid",
    depositPaid: capturedThb,
    balanceDue: balanceThb,
    ...(Object.keys(warnings).length > 0 ? { warnings } : {}),
  });
}

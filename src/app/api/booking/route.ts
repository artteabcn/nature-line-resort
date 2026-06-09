import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { BookingSchema, type BookingInput } from "@/lib/validations/booking";
import { sendOwnerEmail, bookingOwnerEmail } from "@/lib/owner-email";
import { sendBookingConfirmation } from "@/lib/guest-email";
import { createReservation, SmoobuError } from "@/lib/smoobu";
import { ROOM_TO_APARTMENT_ID, SMOOBU_CHANNEL_ID_DIRECT_WEBSITE } from "@/config/smoobu";
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
  const apartmentId = parsed.apartmentId ?? ROOM_TO_APARTMENT_ID[parsed.roomId];
  if (!apartmentId) return false;
  if (meta.apartmentId !== String(apartmentId)) return false;
  if (meta.checkIn !== parsed.checkIn || meta.checkOut !== parsed.checkOut) return false;
  if (meta.guestEmail && meta.guestEmail.toLowerCase() !== parsed.email.toLowerCase()) {
    return false;
  }
  return true;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
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

  const apartmentId = parsed.apartmentId ?? ROOM_TO_APARTMENT_ID[parsed.roomId];
  if (!apartmentId) {
    return NextResponse.json({ error: "Unknown room" }, { status: 400 });
  }

  // Stripe authorization must already be in place. We check status, match the
  // intent's metadata against the submitted booking (anti-tamper), then capture
  // only after Smoobu accepts the reservation.
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

  // totalPrice (full stay) is sent by the client and used for Smoobu reservation.
  // The Stripe intent only holds the deposit; the metadata stores the full price.
  const totalThb =
    parsed.totalPrice ?? Number(intent.metadata?.fullPriceThb ?? Math.round(intent.amount / 100));
  const depositThb = Math.round(intent.amount / 100);
  const balanceThb = Math.max(0, totalThb - depositThb);
  const localId = parsed.bookingId ?? null;

  let smoobuReservationId: number | undefined;
  try {
    const { firstName, lastName } = splitName(parsed.name);
    const reservation = await createReservation({
      apartmentId,
      channelId: SMOOBU_CHANNEL_ID_DIRECT_WEBSITE,
      arrivalDate: parsed.checkIn,
      departureDate: parsed.checkOut,
      firstName,
      lastName,
      email: parsed.email,
      phone: parsed.phone,
      adults: parsed.adults,
      children: parsed.children,
      price: totalThb,
      language: parsed.locale,
      notice: parsed.notes,
    });
    smoobuReservationId = reservation.id;
  } catch (err) {
    // Smoobu rejected: release the Stripe authorization and surface 502.
    try {
      await cancelPaymentIntent(parsed.paymentIntentId, "abandoned");
    } catch (cancelErr) {
      console.error(
        "Stripe cancel after Smoobu failure also failed:",
        cancelErr instanceof Error ? cancelErr.message : cancelErr
      );
    }
    if (localId !== null) {
      await updateBooking(localId, { status: "failed", paymentStatus: "failed" });
    }
    if (err instanceof SmoobuError) {
      return NextResponse.json(
        { error: "Reservation could not be created", status: err.status },
        { status: 502 }
      );
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  // Smoobu accepted — capture the held funds.
  let captured: Stripe.PaymentIntent | null = null;
  try {
    captured = await capturePaymentIntent(parsed.paymentIntentId);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    // Reservation exists in Smoobu but Stripe capture failed. Don't roll back
    // Smoobu — flag for manual review and let the webhook reconcile.
    console.error("Stripe capture failed after Smoobu reservation:", detail);
    if (localId !== null) {
      await updateBooking(localId, {
        status: "confirmed",
        paymentStatus: "authorized",
        smoobuReservationId,
      });
    }
    return NextResponse.json(
      {
        error: "Payment hold could not be captured — booking saved, our team will follow up",
        reservationId: smoobuReservationId,
        bookingId: localId,
      },
      { status: 202 }
    );
  }

  // captured.amount is in satang — store THB in D1 for consistency with totalPrice.
  const capturedThb = Math.round((captured.amount_received ?? captured.amount) / 100);

  if (localId !== null) {
    await updateBooking(localId, {
      status: "confirmed",
      paymentStatus: "paid",
      smoobuReservationId,
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
        reservationId: smoobuReservationId,
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
      reservationId: smoobuReservationId,
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
    reservationId: smoobuReservationId,
    bookingId: localId,
    paymentStatus: "paid",
    depositPaid: capturedThb,
    balanceDue: balanceThb,
    ...(Object.keys(warnings).length > 0 ? { warnings } : {}),
  });
}

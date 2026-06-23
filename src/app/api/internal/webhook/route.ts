import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import type { Stripe } from "@/lib/stripe";
import { getDbOrNull } from "@/lib/db/get-db";
import { bookings } from "@/db/schema";
import { sendOwnerEmail, bookingOwnerEmail } from "@/lib/owner-email";
import { sendBookingConfirmation } from "@/lib/guest-email";

// Called by the central stripe-router Worker (stripe.arkadya.tech).
// Secured via X-Internal-Secret header instead of Stripe signature
// (signature verification already happened at the router).
export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = req.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.INTERNAL_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let event: Stripe.Event;
  try {
    event = (await req.json()) as Stripe.Event;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case "payment_intent.canceled":
      case "payment_intent.payment_failed":
        await syncByIntent((event.data.object as Stripe.PaymentIntent).id, {
          status: "failed",
          paymentStatus: "failed",
        });
        break;
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const intentId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id;
        if (intentId) {
          await syncByIntent(intentId, { paymentStatus: "refunded" });
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("Internal webhook handler error:", err);
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentSucceeded(intent: Stripe.PaymentIntent): Promise<void> {
  const amountPaid = Math.round(intent.amount_received / 100);
  await syncByIntent(intent.id, {
    status: "confirmed",
    paymentStatus: "paid",
    amountPaid,
  });

  const db = await getDbOrNull();
  if (!db) return;

  const rows = await db
    .select()
    .from(bookings)
    .where(eq(bookings.stripePaymentIntentId, intent.id))
    .limit(1)
    .all();
  const booking = rows[0];
  if (!booking) return;

  await Promise.allSettled([
    sendOwnerEmail(
      bookingOwnerEmail({
        name: booking.name,
        email: booking.email,
        phone: booking.phone,
        room: booking.roomId,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        guests: booking.guests,
        notes: booking.notes ?? undefined,
        totalPrice: booking.totalPrice ?? undefined,
        depositPaid: amountPaid,
        balanceDue: 0,
      })
    ),
    sendBookingConfirmation({
      to: booking.email,
      name: booking.name,
      roomId: booking.roomId,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      guests: booking.guests,
      totalPrice: booking.totalPrice ?? amountPaid,
      depositPaid: amountPaid,
      balanceDue: 0,
      locale: booking.locale,
    }),
  ]);
}

async function syncByIntent(
  intentId: string,
  patch: Partial<typeof bookings.$inferInsert>
): Promise<void> {
  const db = await getDbOrNull();
  if (!db) return;
  await db
    .update(bookings)
    .set({ ...patch, updatedAt: new Date().toISOString() })
    .where(eq(bookings.stripePaymentIntentId, intentId));
}

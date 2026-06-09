import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { constructWebhookEvent } from "@/lib/stripe";
import type { Stripe } from "@/lib/stripe";
import { getDbOrNull } from "@/lib/db/get-db";
import { bookings } from "@/db/schema";

// Webhook signature requires the raw request body, so we read text() directly
// and never let Next parse JSON for us.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }
  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = await constructWebhookEvent(payload, signature);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("Stripe webhook signature verification failed:", detail);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await syncByIntent((event.data.object as Stripe.PaymentIntent).id, {
          paymentStatus: "paid",
        });
        break;
      case "payment_intent.canceled":
        await syncByIntent((event.data.object as Stripe.PaymentIntent).id, {
          paymentStatus: "failed",
        });
        break;
      case "payment_intent.payment_failed":
        await syncByIntent((event.data.object as Stripe.PaymentIntent).id, {
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
        // Ignore other event types — Stripe sends a lot we don't care about.
        break;
    }
  } catch (err) {
    console.error("Stripe webhook handler error:", err);
    // Return 200 so Stripe doesn't retry forever on transient failures we've
    // already logged. Real errors surface in Cloudflare logs.
  }

  return NextResponse.json({ received: true });
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

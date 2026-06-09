// Server-only Stripe client.
// Uses the fetch-based HTTP client so it runs in Cloudflare's edge runtime
// (the default Node http client isn't available on Workers/Pages).
import Stripe from "stripe";

// Cache a single client per worker isolate.
let cached: Stripe | null = null;

function getClient(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  cached = new Stripe(key, {
    httpClient: Stripe.createFetchHttpClient(),
    apiVersion: "2026-04-22.dahlia",
  });
  return cached;
}

export interface CreateIntentInput {
  amount: number; // in smallest currency unit (THB satang = THB * 100)
  currency: string; // "thb"
  receiptEmail?: string;
  description?: string; // shown on the guest's card statement / Stripe dashboard
  metadata?: Record<string, string>;
}

export async function createPaymentIntent(input: CreateIntentInput): Promise<Stripe.PaymentIntent> {
  const stripe = getClient();
  return stripe.paymentIntents.create({
    amount: input.amount,
    currency: input.currency,
    capture_method: "manual",
    automatic_payment_methods: { enabled: true },
    receipt_email: input.receiptEmail,
    description: input.description,
    metadata: input.metadata,
  });
}

export async function retrievePaymentIntent(id: string): Promise<Stripe.PaymentIntent> {
  return getClient().paymentIntents.retrieve(id);
}

export async function capturePaymentIntent(id: string): Promise<Stripe.PaymentIntent> {
  return getClient().paymentIntents.capture(id);
}

export async function cancelPaymentIntent(
  id: string,
  reason?: Stripe.PaymentIntentCancelParams.CancellationReason
): Promise<Stripe.PaymentIntent> {
  return getClient().paymentIntents.cancel(
    id,
    reason ? { cancellation_reason: reason } : undefined
  );
}

export async function constructWebhookEvent(
  payload: string,
  signature: string
): Promise<Stripe.Event> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  // constructEventAsync uses Web Crypto, required on Workers (sync version uses Node crypto).
  return getClient().webhooks.constructEventAsync(payload, signature, secret);
}

export type { Stripe };

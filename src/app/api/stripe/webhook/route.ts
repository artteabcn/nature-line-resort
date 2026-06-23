import { NextResponse } from "next/server";

// Stripe webhook events are now routed via the central stripe-router Worker
// at https://stripe.arkadya.tech \u2192 /api/internal/webhook
export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    {
      error: "This endpoint is no longer active. Events route via stripe.arkadya.tech",
    },
    { status: 410 }
  );
}

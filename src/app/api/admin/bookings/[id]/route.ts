import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getAdminUser } from "@/lib/admin-auth";
import { getDbOrNull } from "@/lib/db/get-db";
import { bookings } from "@/db/schema";
import { isAvailable } from "@/lib/availability";
import { sendBookingConfirmation } from "@/lib/guest-email";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const PatchSchema = z
  .object({
    checkIn: z.string().regex(ISO_DATE),
    checkOut: z.string().regex(ISO_DATE),
  })
  .refine((d) => d.checkOut > d.checkIn, {
    message: "Check-out must be after check-in",
    path: ["checkOut"],
  });

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const user = await getAdminUser(req.headers);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const bookingId = parseInt(id, 10);
  if (isNaN(bookingId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { checkIn, checkOut } = parsed.data;

  const db = await getDbOrNull();
  if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

  const rows = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1).all();
  const booking = rows[0];
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const available = await isAvailable(booking.roomId, checkIn, checkOut, bookingId);
  if (!available) {
    return NextResponse.json({ error: "New dates are not available" }, { status: 409 });
  }

  await db
    .update(bookings)
    .set({ checkIn, checkOut, updatedAt: new Date().toISOString() })
    .where(eq(bookings.id, bookingId));

  const nights = Math.round(
    (new Date(`${checkOut}T00:00:00Z`).getTime() - new Date(`${checkIn}T00:00:00Z`).getTime()) /
      86_400_000
  );

  await sendBookingConfirmation({
    to: booking.email,
    name: booking.name,
    roomId: booking.roomId,
    checkIn,
    checkOut,
    guests: booking.guests,
    totalPrice: booking.totalPrice ?? 0,
    depositPaid: booking.amountPaid ?? 0,
    balanceDue: 0,
    locale: booking.locale,
  }).catch((err) =>
    console.error("Guest date-change email failed:", err instanceof Error ? err.message : err)
  );

  return NextResponse.json({ ok: true, bookingId, checkIn, checkOut, nights });
}

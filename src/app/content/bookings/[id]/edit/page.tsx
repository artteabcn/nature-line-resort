import React from "react";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { getDbOrNull } from "@/lib/db/get-db";
import { bookings } from "@/db/schema";
import BookingDateEditor from "./BookingDateEditor";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BookingEditPage({ params }: PageProps): Promise<React.JSX.Element> {
  await requireAdmin();

  const { id } = await params;
  const bookingId = parseInt(id, 10);
  if (isNaN(bookingId)) notFound();

  const db = await getDbOrNull();
  if (!db) {
    return (
      <div className="text-brand-ink-soft p-8 text-center text-sm">Database not available.</div>
    );
  }

  const rows = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1).all();
  const booking = rows[0];
  if (!booking) notFound();

  return (
    <div>
      <h1 className="text-brand-ink font-serif text-3xl font-semibold">Move Dates</h1>
      <p className="text-brand-ink-soft mt-2 text-sm">
        Booking #{booking.id} \u2014 {booking.name} \u2014 {booking.roomId}
      </p>
      <BookingDateEditor booking={booking} />
    </div>
  );
}

import React from "react";
import { requireAdmin } from "@/lib/admin-auth";
import { getBlockedDates } from "@/lib/availability";
import { getSiteConfig } from "@/lib/content";
import { getDbOrNull } from "@/lib/db/get-db";
import { bookings } from "@/db/schema";
import CalendarEditor from "./CalendarEditor";

export default async function CalendarPage(): Promise<React.JSX.Element> {
  await requireAdmin();

  const [blocked, config] = await Promise.all([getBlockedDates(), getSiteConfig()]);

  const db = await getDbOrNull();
  const allBookings = db
    ? await db
        .select({
          roomId: bookings.roomId,
          checkIn: bookings.checkIn,
          checkOut: bookings.checkOut,
          status: bookings.status,
        })
        .from(bookings)
        .all()
    : [];

  return (
    <div>
      <h1 className="text-brand-ink font-serif text-3xl font-semibold">Calendar</h1>
      <p className="text-brand-ink-soft mt-2 text-sm">
        Click a day to block or unblock it. Blue = booked, red = manually blocked, green =
        available.
      </p>
      <div className="mt-8">
        <CalendarEditor
          blockedDates={blocked}
          bookings={allBookings}
          minStay={config.minStay}
          cutoffHour={config.cutoffHour}
        />
      </div>
    </div>
  );
}

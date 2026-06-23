import { and, eq, ne, or } from "drizzle-orm";
import { bookings, blockedDates } from "@/db/schema";
import type { BlockedDateRow } from "@/db/schema";
import { getDbOrNull } from "@/lib/db/get-db";
import { getSiteConfig } from "@/lib/content";

function nightsBetween(checkIn: string, checkOut: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${checkIn}T00:00:00Z`);
  const end = new Date(`${checkOut}T00:00:00Z`);
  while (cursor < end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export async function getUnavailableDates(
  roomId: string,
  excludeBookingId?: number
): Promise<string[]> {
  const db = await getDbOrNull();
  if (!db) return [];
  try {
    const statusFilter = and(
      eq(bookings.roomId, roomId),
      or(eq(bookings.status, "confirmed"), eq(bookings.status, "pending")),
      excludeBookingId !== undefined ? ne(bookings.id, excludeBookingId) : undefined
    );
    const [confirmedBookings, blocked] = await Promise.all([
      db
        .select({ checkIn: bookings.checkIn, checkOut: bookings.checkOut })
        .from(bookings)
        .where(statusFilter)
        .all(),
      db
        .select({ date: blockedDates.date })
        .from(blockedDates)
        .where(eq(blockedDates.roomId, roomId))
        .all(),
    ]);

    const unavailable = new Set<string>(blocked.map((b) => b.date));
    for (const b of confirmedBookings) {
      for (const d of nightsBetween(b.checkIn, b.checkOut)) {
        unavailable.add(d);
      }
    }
    return Array.from(unavailable).sort();
  } catch {
    return [];
  }
}

export async function isAvailable(
  roomId: string,
  checkIn: string,
  checkOut: string,
  excludeBookingId?: number
): Promise<boolean> {
  const nights = nightsBetween(checkIn, checkOut);
  if (nights.length === 0) return false;
  const unavailable = await getUnavailableDates(roomId, excludeBookingId);
  const unavailableSet = new Set(unavailable);
  return nights.every((d) => !unavailableSet.has(d));
}

export async function isSameDayCutoffPassed(): Promise<boolean> {
  const config = await getSiteConfig();
  const bkkStr = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Bangkok",
    hour: "numeric",
    hour12: false,
  });
  const hour = parseInt(bkkStr, 10);
  return hour >= config.cutoffHour;
}

export async function blockDate(roomId: string, date: string, reason?: string): Promise<void> {
  const db = await getDbOrNull();
  if (!db) throw new Error("D1 not available");
  await db
    .insert(blockedDates)
    .values({ roomId, date, reason: reason ?? null, createdAt: new Date().toISOString() })
    .onConflictDoNothing();
}

export async function unblockDate(roomId: string, date: string): Promise<void> {
  const db = await getDbOrNull();
  if (!db) throw new Error("D1 not available");
  await db
    .delete(blockedDates)
    .where(and(eq(blockedDates.roomId, roomId), eq(blockedDates.date, date)));
}

export async function getBlockedDates(roomId?: string): Promise<BlockedDateRow[]> {
  const db = await getDbOrNull();
  if (!db) return [];
  try {
    if (roomId) {
      return db.select().from(blockedDates).where(eq(blockedDates.roomId, roomId)).all();
    }
    return db.select().from(blockedDates).all();
  } catch {
    return [];
  }
}

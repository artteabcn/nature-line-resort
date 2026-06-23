import React from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { getDbOrNull } from "@/lib/db/get-db";
import { bookings } from "@/db/schema";
import { desc } from "drizzle-orm";

function nightCount(checkIn: string, checkOut: string): number {
  const ms =
    new Date(`${checkOut}T00:00:00Z`).getTime() - new Date(`${checkIn}T00:00:00Z`).getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

export default async function BookingsPage(): Promise<React.JSX.Element> {
  await requireAdmin();

  const db = await getDbOrNull();
  const rows = db ? await db.select().from(bookings).orderBy(desc(bookings.checkIn)).all() : [];

  return (
    <div>
      <h1 className="text-brand-ink font-serif text-3xl font-semibold">Bookings</h1>
      <p className="text-brand-ink-soft mt-2 text-sm">All bookings, newest check-in first.</p>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-black/5 bg-white">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-black/5">
            <tr className="text-brand-ink-soft text-left text-xs font-semibold tracking-wider uppercase">
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Room</th>
              <th className="px-4 py-3">Guest</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Nights</th>
              <th className="px-4 py-3">Total THB</th>
              <th className="px-4 py-3">Arkadya Fee</th>
              <th className="px-4 py-3">Owner Payout</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="text-brand-ink-soft px-4 py-8 text-center text-sm">
                  No bookings yet.
                </td>
              </tr>
            )}
            {rows.map((b) => {
              const nights = nightCount(b.checkIn, b.checkOut);
              const statusColor =
                b.status === "confirmed"
                  ? "text-green-700 bg-green-50"
                  : b.status === "failed" || b.status === "cancelled"
                    ? "text-red-700 bg-red-50"
                    : "text-yellow-700 bg-yellow-50";
              return (
                <tr key={b.id} className="hover:bg-gray-50/50">
                  <td className="text-brand-ink-soft px-4 py-3 font-mono text-xs">#{b.id}</td>
                  <td className="text-brand-ink px-4 py-3 font-medium">{b.roomId}</td>
                  <td className="px-4 py-3">
                    <p className="text-brand-ink font-medium">{b.name}</p>
                    <p className="text-brand-ink-soft text-xs">{b.email}</p>
                  </td>
                  <td className="text-brand-ink px-4 py-3">
                    {b.checkIn} \u2192 {b.checkOut}
                  </td>
                  <td className="text-brand-ink px-4 py-3 text-center">{nights}</td>
                  <td className="text-brand-ink px-4 py-3 font-semibold">
                    {(b.totalPrice ?? 0).toLocaleString()}
                  </td>
                  <td className="text-brand-ink-soft px-4 py-3">
                    {b.arkadyaFeeThb.toLocaleString()}
                  </td>
                  <td className="text-brand-ink px-4 py-3">{b.ownerPayoutThb.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusColor}`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/content/bookings/${b.id}/edit`}
                      className="text-brand-pink text-xs hover:underline"
                    >
                      Move dates
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

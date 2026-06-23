"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { Booking } from "@/db/schema";

interface BookingDateEditorProps {
  booking: Booking;
}

export default function BookingDateEditor({ booking }: BookingDateEditorProps): React.JSX.Element {
  const [checkIn, setCheckIn] = useState(booking.checkIn);
  const [checkOut, setCheckOut] = useState(booking.checkOut);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function save(): Promise<void> {
    if (checkIn >= checkOut) {
      setMessage({ type: "error", text: "Check-out must be after check-in" });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkIn, checkOut }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setMessage({ type: "ok", text: "Dates updated. Guest email sent." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "focus:border-brand-pink w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm transition-colors outline-none";

  return (
    <div className="mt-8 max-w-sm rounded-2xl border border-black/5 bg-white p-6">
      <Link
        href="/content/bookings"
        className="text-brand-ink-soft hover:text-brand-pink mb-6 inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="size-4" />
        Back to bookings
      </Link>

      <div className="mt-4 grid gap-4">
        <div>
          <label className="text-brand-ink mb-1.5 block text-xs font-semibold tracking-wider uppercase">
            New Check-in
          </label>
          <input
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-brand-ink mb-1.5 block text-xs font-semibold tracking-wider uppercase">
            New Check-out
          </label>
          <input
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {message && (
        <p className={`mt-4 text-sm ${message.type === "ok" ? "text-green-600" : "text-red-600"}`}>
          {message.text}
        </p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="btn-pill-primary mt-6 inline-flex items-center gap-2 disabled:opacity-50"
      >
        {saving && <Loader2 className="size-4 animate-spin" />}
        Save new dates
      </button>
    </div>
  );
}

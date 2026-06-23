"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { ROOMS } from "@/config/rooms";
import type { BlockedDateRow } from "@/db/schema";
import type { Booking } from "@/db/schema";

interface CalendarEditorProps {
  blockedDates: BlockedDateRow[];
  bookings: Pick<Booking, "roomId" | "checkIn" | "checkOut" | "status">[];
  minStay: number;
  cutoffHour: number;
}

function isoDate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function nightsBetween(checkIn: string, checkOut: string): Set<string> {
  const dates = new Set<string>();
  const cursor = new Date(`${checkIn}T00:00:00Z`);
  const end = new Date(`${checkOut}T00:00:00Z`);
  while (cursor < end) {
    dates.add(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export default function CalendarEditor({
  blockedDates,
  bookings,
  minStay: initialMinStay,
  cutoffHour: initialCutoffHour,
}: CalendarEditorProps): React.JSX.Element {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [loading, setLoading] = useState<string | null>(null);
  const [localBlocked, setLocalBlocked] = useState<Set<string>>(
    new Set(blockedDates.map((b) => `${b.roomId}::${b.date}`))
  );
  const [minStay, setMinStay] = useState(String(initialMinStay));
  const [cutoffHour, setCutoffHour] = useState(String(initialCutoffHour));
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);

  const bookedDates = new Map<string, Set<string>>();
  for (const room of ROOMS) {
    bookedDates.set(room.id, new Set());
  }
  for (const b of bookings) {
    if (b.status === "confirmed" || b.status === "pending") {
      const set = bookedDates.get(b.roomId);
      if (set) {
        for (const d of nightsBetween(b.checkIn, b.checkOut)) {
          set.add(d);
        }
      }
    }
  }

  function prevMonth(): void {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function nextMonth(): void {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  async function toggleDate(roomId: string, date: string): Promise<void> {
    const key = `${roomId}::${date}`;
    const isBlocked = localBlocked.has(key);
    const action = isBlocked ? "unblock" : "block";
    setLoading(key);
    try {
      const res = await fetch("/api/admin/content/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, roomId, date }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setLocalBlocked((prev) => {
        const next = new Set(prev);
        if (isBlocked) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
    } catch (err) {
      console.error("Toggle date failed:", err instanceof Error ? err.message : err);
    } finally {
      setLoading(null);
    }
  }

  async function saveSettings(): Promise<void> {
    setSavingSettings(true);
    setSettingsMsg(null);
    try {
      const res = await fetch("/api/admin/content/site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changes: [
            { key: "min_stay", value: minStay },
            { key: "cutoff_hour", value: cutoffHour },
          ],
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSettingsMsg("Saved");
    } catch (err) {
      setSettingsMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingSettings(false);
    }
  }

  const days = daysInMonth(year, month);
  const monthLabel = new Date(year, month, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end gap-6 rounded-2xl border border-black/5 bg-white p-6">
        <div>
          <label className="text-brand-ink mb-1 block text-sm font-medium">Min Stay (nights)</label>
          <input
            type="number"
            min={1}
            value={minStay}
            onChange={(e) => setMinStay(e.target.value)}
            className="focus:border-brand-pink w-24 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none"
          />
        </div>
        <div>
          <label className="text-brand-ink mb-1 block text-sm font-medium">
            Same-day Cutoff Hour (BKK)
          </label>
          <input
            type="number"
            min={0}
            max={23}
            value={cutoffHour}
            onChange={(e) => setCutoffHour(e.target.value)}
            className="focus:border-brand-pink w-24 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none"
          />
        </div>
        <button
          type="button"
          onClick={saveSettings}
          disabled={savingSettings}
          className="btn-pill-primary inline-flex items-center gap-2 disabled:opacity-50"
        >
          {savingSettings && <Loader2 className="size-4 animate-spin" />}
          Save settings
        </button>
        {settingsMsg && (
          <p className={`text-sm ${settingsMsg === "Saved" ? "text-green-600" : "text-red-600"}`}>
            {settingsMsg}
          </p>
        )}
      </div>

      <div className="mb-4 flex items-center gap-4">
        <button
          type="button"
          onClick={prevMonth}
          className="rounded-lg border border-black/10 bg-white p-2 hover:bg-gray-50"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-brand-ink font-serif text-lg font-semibold">{monthLabel}</span>
        <button
          type="button"
          onClick={nextMonth}
          className="rounded-lg border border-black/10 bg-white p-2 hover:bg-gray-50"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-4 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-green-100 ring-1 ring-green-300" /> Available
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-red-100 ring-1 ring-red-300" /> Blocked (manual)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-blue-100 ring-1 ring-blue-300" /> Booked
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {ROOMS.map((room) => {
          const booked = bookedDates.get(room.id) ?? new Set<string>();
          return (
            <div key={room.id} className="rounded-2xl border border-black/5 bg-white p-5">
              <h3 className="text-brand-ink mb-4 font-serif text-lg font-semibold">
                {room.id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </h3>
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
                {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-1">
                {Array.from({
                  length:
                    new Date(year, month, 1).getDay() === 0
                      ? 6
                      : new Date(year, month, 1).getDay() - 1,
                }).map((_, i) => (
                  <div key={`pad-${i}`} />
                ))}
                {Array.from({ length: days }, (_, i) => i + 1).map((day) => {
                  const date = isoDate(year, month, day);
                  const key = `${room.id}::${date}`;
                  const isBooked = booked.has(date);
                  const isBlocked = localBlocked.has(key);
                  const isLoading = loading === key;
                  let cellClass = "bg-green-50 hover:bg-green-100 cursor-pointer";
                  if (isBooked) cellClass = "bg-blue-50 cursor-not-allowed";
                  else if (isBlocked) cellClass = "bg-red-50 hover:bg-red-100 cursor-pointer";
                  return (
                    <button
                      key={date}
                      type="button"
                      disabled={isBooked || isLoading}
                      onClick={() => !isBooked && toggleDate(room.id, date)}
                      className={`rounded-md p-1.5 text-center text-xs transition-colors ${cellClass} disabled:opacity-50`}
                    >
                      {isLoading ? <Loader2 className="mx-auto size-3 animate-spin" /> : day}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

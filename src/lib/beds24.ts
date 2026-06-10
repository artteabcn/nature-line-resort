const BASE_URL = "https://api.beds24.com/v2";

export class Beds24Error extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string
  ) {
    super(`Beds24 API ${status}: ${body}`);
    this.name = "Beds24Error";
  }
}

// Exchange a refresh token for a short-lived access token (24h expiry).
// Call once per request group (availability check, booking creation) and pass
// the returned token to each subsequent beds24Fetch call in that group.
export async function getAccessToken(): Promise<string> {
  const refreshToken = process.env.BEDS24_REFRESH_TOKEN;
  if (!refreshToken) throw new Error("BEDS24_REFRESH_TOKEN is not configured");
  const res = await fetch(`${BASE_URL}/authentication/token`, {
    headers: { refreshToken },
  });
  if (!res.ok) throw new Beds24Error(res.status, await res.text());
  const data = (await res.json()) as { token: string; expiresIn?: number };
  if (!data.token) throw new Beds24Error(0, "No token returned by Beds24");
  return data.token;
}

async function beds24Fetch<T>(
  token: string,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      token,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers as Record<string, string>),
    },
  });
  if (!res.ok) throw new Beds24Error(res.status, await res.text());
  return (await res.json()) as T;
}

// ── Calendar (daily availability + rates) ────────────────────────────────────

export interface DayCalendar {
  available?: number;  // 1 = open, 0 = blocked/booked
  price1?: number;     // nightly rate (first price level in Beds24)
  minStay?: number;    // minimum nights required for an arrival on this date
}

// { [roomId as string]: { [YYYY-MM-DD]: DayCalendar } }
export type CalendarByRoom = Record<string, Record<string, DayCalendar>>;

export async function getCalendar(opts: {
  token: string;
  roomIds: number[];
  startDate: string;  // YYYY-MM-DD (arrival)
  endDate: string;    // YYYY-MM-DD (departure — exclusive)
}): Promise<CalendarByRoom> {
  const params = new URLSearchParams({
    startDate: opts.startDate,
    endDate: opts.endDate,
  });
  opts.roomIds.forEach((id) => params.append("roomId", String(id)));
  // Beds24 wraps the response in { data: {...} }
  const raw = await beds24Fetch<{ data?: CalendarByRoom } | CalendarByRoom>(
    opts.token,
    `/inventory/rooms/calendar?${params}`
  );
  return (raw as { data?: CalendarByRoom }).data ?? (raw as CalendarByRoom);
}

// ── Create booking ────────────────────────────────────────────────────────────

export interface CreateBookingPayload {
  propertyId: number;
  roomId: number;
  arrival: string;     // YYYY-MM-DD
  departure: string;   // YYYY-MM-DD
  numAdult: number;
  numChild?: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  price?: number;      // full stay total in property currency (THB)
  message?: string;    // guest notes
  apiSourceId?: number;
}

export interface Beds24Booking {
  id: number;
  propertyId?: number;
  roomId?: number;
  arrival?: string;
  departure?: string;
  firstName?: string;
  lastName?: string;
}

// Beds24 accepts an array — we always send one booking and read back index 0.
export async function createBooking(
  token: string,
  payload: CreateBookingPayload
): Promise<Beds24Booking> {
  const res = await beds24Fetch<{ data?: Beds24Booking[] }>(token, "/bookings", {
    method: "POST",
    body: JSON.stringify([payload]),
  });
  const created = res.data?.[0];
  if (!created?.id) throw new Beds24Error(0, "No booking ID in Beds24 response");
  return created;
}

const SMOOBU_HOST = "https://login.smoobu.com";
const BASE_URL = `${SMOOBU_HOST}/api`;

class SmoobuError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(`Smoobu API ${status}: ${body}`);
    this.name = "SmoobuError";
    this.status = status;
    this.body = body;
  }
}

function getApiKey(): string {
  const key = process.env.SMOOBU_API_KEY;
  if (!key) throw new Error("SMOOBU_API_KEY is not configured");
  return key;
}

async function smoobuFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Api-Key": getApiKey(),
      "Content-Type": "application/json",
      Accept: "application/json",
      ...init.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new SmoobuError(res.status, text);
  }

  return (await res.json()) as T;
}

export interface Apartment {
  id: number;
  name: string;
  type?: string;
  rooms?: number;
  beds?: number;
  maxOccupancy?: number;
}

export async function listApartments(): Promise<Apartment[]> {
  const data = await smoobuFetch<{ apartments: Apartment[] }>("/apartments");
  return data.apartments;
}

export interface AvailabilityRequest {
  arrivalDate: string;
  departureDate: string;
  apartments?: number[];
  customerId?: number;
  guests?: number;
}

export interface AvailabilityResponse {
  availableApartments: number[];
  prices?: Record<string, { price: number; currency: string }>;
  errorMessages?: Record<string, { errorCode: number; message: string }>;
}

export async function checkAvailability(
  payload: AvailabilityRequest
): Promise<AvailabilityResponse> {
  // The availability endpoint lives at /booking/... (no /api prefix), unlike
  // most other Smoobu endpoints. Pass the absolute URL to bypass BASE_URL.
  return smoobuFetch<AvailabilityResponse>(`${SMOOBU_HOST}/booking/checkApartmentAvailability`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface RatesQuery {
  apartmentIds: number[];
  startDate: string;
  endDate: string;
}

export interface DailyRate {
  price?: number;
  min_length_of_stay?: number;
  available?: number;
}

export type RatesResponse = Record<string, Record<string, DailyRate>>;

export async function getRates({
  apartmentIds,
  startDate,
  endDate,
}: RatesQuery): Promise<RatesResponse> {
  const params = new URLSearchParams();
  apartmentIds.forEach((id) => params.append("apartments[]", String(id)));
  params.set("start_date", startDate);
  params.set("end_date", endDate);
  // Newer Smoobu responses wrap rates in `{ data: { ... } }`; older ones return
  // the apartments map directly. Accept both shapes.
  const raw = (await smoobuFetch<unknown>(`/rates?${params.toString()}`)) as
    | RatesResponse
    | { data: RatesResponse };
  const inner = (raw as { data?: RatesResponse }).data;
  if (inner && typeof inner === "object") {
    return inner;
  }
  return raw as RatesResponse;
}

export interface CreateReservationRequest {
  apartmentId: number;
  channelId: number;
  arrivalDate: string;
  departureDate: string;
  arrivalTime?: string;
  departureTime?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  country?: string;
  language?: string;
  adults: number;
  children?: number;
  price?: number;
  priceStatus?: number;
  notice?: string;
}

export interface ReservationResponse {
  id: number;
  reference_id?: string;
  apartment?: { id: number; name?: string };
  arrival?: string;
  departure?: string;
  guest_name?: string;
  email?: string;
  price?: number;
}

export async function createReservation(
  payload: CreateReservationRequest
): Promise<ReservationResponse> {
  return smoobuFetch<ReservationResponse>("/reservations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export { SmoobuError };

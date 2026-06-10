"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, BedDouble, Coffee, Eye, Loader2, Lock, Trees, Users, Wind } from "lucide-react";
import {
  loadStripe,
  type Stripe as StripeJs,
  type StripeExpressCheckoutElementReadyEvent,
} from "@stripe/stripe-js";
import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { cn } from "@/lib/utils";

interface AvailableRoom {
  beds24RoomId: number;
  roomId: string | null;
  totalPrice: number | null;
  currency: string;
  nights: number;
}

const SearchSchema = z
  .object({
    checkIn: z.string().min(1),
    checkOut: z.string().min(1),
    adults: z.coerce.number().int().min(1).max(10),
    children: z.coerce.number().int().min(0).max(10),
  })
  .refine((d) => d.checkOut > d.checkIn, {
    message: "Check-out must be after check-in",
    path: ["checkOut"],
  });

type SearchValues = z.input<typeof SearchSchema>;
type SearchInput = z.output<typeof SearchSchema>;

const GuestSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6),
  notes: z.string().optional(),
});

type GuestInput = z.infer<typeof GuestSchema>;

type Step = "search" | "results" | "guest" | "payment" | "success" | "error";

const inputClass =
  "focus:border-brand-pink w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm transition-colors outline-none";

const labelClass = "text-brand-ink mb-1.5 block text-xs font-semibold tracking-wider uppercase";

interface RoomCopy {
  id: string;
  name: string;
  description: string;
  beds: string;
  view: string;
  maxGuests: number;
}

interface PaymentSession {
  clientSecret: string;
  paymentIntentId: string;
  bookingId: number | null;
  depositAmount: number;
  balanceDue: number;
  totalAmount: number;
  depositPercent: number;
}

// loadStripe must run only once per page load — pull the publishable key at
// module scope and cache the promise.
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
let stripePromise: Promise<StripeJs | null> | null = null;
function getStripe(): Promise<StripeJs | null> {
  if (!PUBLISHABLE_KEY) return Promise.resolve(null);
  if (!stripePromise) stripePromise = loadStripe(PUBLISHABLE_KEY);
  return stripePromise;
}

export default function BookingForm(): React.JSX.Element {
  const t = useTranslations("booking");
  const tRooms = useTranslations("rooms");
  const locale = useLocale();
  const roomItems = tRooms.raw("items") as RoomCopy[];
  const roomCopyById = Object.fromEntries(roomItems.map((r) => [r.id, r])) as Record<
    string,
    RoomCopy | undefined
  >;
  const amenities = [
    { icon: BedDouble, label: tRooms("feature1") },
    { icon: Wind, label: tRooms("feature2") },
    { icon: Trees, label: tRooms("feature3") },
    { icon: Coffee, label: tRooms("feature4") },
  ];
  const [step, setStep] = useState<Step>("search");
  const [available, setAvailable] = useState<AvailableRoom[]>([]);
  const [criteria, setCriteria] = useState<SearchInput | null>(null);
  const [selected, setSelected] = useState<AvailableRoom | null>(null);
  const [guestData, setGuestData] = useState<GuestInput | null>(null);
  const [payment, setPayment] = useState<PaymentSession | null>(null);
  const [reservationId, setReservationId] = useState<number | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  // Minimum nights required for the searched arrival date — returned by
  // /api/availability, used to explain an empty result set ("minimum N nights").
  const [minStay, setMinStay] = useState(1);

  // Render an inert placeholder during SSR + first client paint, then swap to
  // the real form after mount. Eliminates any hydration mismatch source within
  // this tree (React #418).
  const [mounted, setMounted] = useState(false);
  const [today, setToday] = useState<string>("");
  useEffect(() => {
    setMounted(true);
    setToday(new Date().toISOString().slice(0, 10));
  }, []);

  const search = useForm<SearchValues, unknown, SearchInput>({
    resolver: zodResolver(SearchSchema),
    defaultValues: { adults: 2, children: 0 },
  });

  const guest = useForm<GuestInput>({
    resolver: zodResolver(GuestSchema),
  });

  // Nights in the current search, used to tell an empty result set caused by
  // a minimum-stay rule apart from genuine no-availability.
  const searchedNights = useMemo(() => {
    if (!criteria) return 0;
    const ms =
      new Date(`${criteria.checkOut}T00:00:00Z`).getTime() -
      new Date(`${criteria.checkIn}T00:00:00Z`).getTime();
    return Math.round(ms / 86_400_000);
  }, [criteria]);

  // Several room types may share a display category. Show one card per category —
  // the cheapest available unit represents it — so the guest picks a room type,
  // not a near-identical duplicate. A concrete beds24RoomId is still carried
  // through for the reservation.
  const displayRooms = useMemo(() => {
    const order = roomItems.map((r) => r.id);
    const byCategory = new Map<string, AvailableRoom>();
    for (const room of available) {
      const key = room.roomId ?? String(room.beds24RoomId);
      const current = byCategory.get(key);
      if (!current || (room.totalPrice ?? Infinity) < (current.totalPrice ?? Infinity)) {
        byCategory.set(key, room);
      }
    }
    return Array.from(byCategory.values()).sort(
      (a, b) => order.indexOf(a.roomId ?? "") - order.indexOf(b.roomId ?? "")
    );
  }, [available, roomItems]);

  async function onSearch(data: SearchInput): Promise<void> {
    try {
      const res = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          arrival: data.checkIn,
          departure: data.checkOut,
          adults: data.adults,
          children: data.children,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as {
        available: AvailableRoom[];
        nights: number;
        minStayRequired?: number;
        notConfigured?: boolean;
      };
      if (json.notConfigured) {
        setErrorDetail("Online booking is not yet available for this property — please contact us to reserve.");
        setStep("error");
        return;
      }
      setCriteria(data);
      setAvailable(json.available);
      setMinStay(json.minStayRequired ?? 1);
      setStep("results");
    } catch (err) {
      setErrorDetail(err instanceof Error ? err.message : "unknown");
      setStep("error");
    }
  }

  async function onGuestSubmit(data: GuestInput): Promise<void> {
    if (!criteria || !selected) return;
    try {
      const roomId = selected.roomId ?? "cosy";
      const res = await fetch("/api/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          roomId,
          beds24RoomId: selected.beds24RoomId,
          checkIn: criteria.checkIn,
          checkOut: criteria.checkOut,
          adults: criteria.adults,
          children: criteria.children,
          locale,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as PaymentSession;
      setGuestData(data);
      setPayment(json);
      setStep("payment");
    } catch (err) {
      setErrorDetail(err instanceof Error ? err.message : "unknown");
      setStep("error");
    }
  }

  async function onPaymentAuthorized(): Promise<void> {
    if (!criteria || !selected || !guestData || !payment) return;
    try {
      const roomId = selected.roomId ?? "cosy";
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...guestData,
          roomId,
          beds24RoomId: selected.beds24RoomId,
          checkIn: criteria.checkIn,
          checkOut: criteria.checkOut,
          adults: criteria.adults,
          children: criteria.children,
          totalPrice: payment.totalAmount,
          locale,
          paymentIntentId: payment.paymentIntentId,
          bookingId: payment.bookingId,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { reservationId?: number };
      setReservationId(json.reservationId ?? null);
      setStep("success");
    } catch (err) {
      setErrorDetail(err instanceof Error ? err.message : "unknown");
      setStep("error");
    }
  }

  if (!mounted) {
    return (
      <div
        aria-hidden
        className="h-[420px] animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-black/5"
      />
    );
  }

  if (step === "success") {
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-black/5">
        <div className="bg-brand-teal-light text-brand-teal mx-auto flex size-14 items-center justify-center rounded-full">
          <BedDouble className="size-7" />
        </div>
        <h3 className="text-brand-ink mt-6 font-serif text-3xl font-semibold">
          {t("successTitle")}
        </h3>
        <p className="text-brand-ink-soft mx-auto mt-3 max-w-md text-sm">
          {t("successDetail", { id: reservationId ?? "—" })}
        </p>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-black/5">
        <h3 className="text-brand-pink font-serif text-3xl font-semibold">{t("errorTitle")}</h3>
        <p className="text-brand-ink-soft mx-auto mt-3 max-w-md text-sm">
          {errorDetail ?? t("errorDetail")}
        </p>
        <button
          type="button"
          onClick={() => {
            setErrorDetail(null);
            setPayment(null);
            setStep("search");
          }}
          className="btn-pill-outline mt-6"
        >
          {t("back")}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 md:p-10">
      {step === "search" && (
        <form onSubmit={search.handleSubmit(onSearch)} className="grid gap-5 md:grid-cols-4">
          <div className="md:col-span-1">
            <label className={labelClass} htmlFor="checkIn">
              {t("checkIn")}
            </label>
            <input
              id="checkIn"
              type="date"
              {...search.register("checkIn")}
              min={today || undefined}
              className={cn(inputClass, search.formState.errors.checkIn && "border-red-400")}
            />
          </div>
          <div className="md:col-span-1">
            <label className={labelClass} htmlFor="checkOut">
              {t("checkOut")}
            </label>
            <input
              id="checkOut"
              type="date"
              {...search.register("checkOut")}
              min={today || undefined}
              className={cn(inputClass, search.formState.errors.checkOut && "border-red-400")}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="adults">
              {t("adults")}
            </label>
            <input
              id="adults"
              type="number"
              min={1}
              max={10}
              {...search.register("adults")}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="children">
              {t("children")}
            </label>
            <input
              id="children"
              type="number"
              min={0}
              max={10}
              {...search.register("children")}
              className={inputClass}
            />
          </div>
          <div className="md:col-span-4">
            <button
              type="submit"
              disabled={search.formState.isSubmitting}
              className="btn-pill-primary w-full disabled:opacity-60 md:w-auto"
            >
              {search.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {t("searching")}
                </>
              ) : (
                t("findRooms")
              )}
            </button>
          </div>
        </form>
      )}

      {step === "results" && criteria && (
        <div>
          <button
            type="button"
            onClick={() => setStep("search")}
            className="text-brand-ink-soft hover:text-brand-pink mb-6 inline-flex items-center gap-2 text-sm"
          >
            <ArrowLeft className="size-4" />
            {t("back")}
          </button>
          <p className="text-brand-ink-soft text-sm">
            {criteria.checkIn} → {criteria.checkOut} · {criteria.adults + criteria.children}{" "}
            {t("adults")}
          </p>
          {available.length === 0 ? (
            <p className="text-brand-ink bg-brand-blush mt-8 rounded-xl p-6 text-center text-sm">
              {searchedNights < minStay ? t("minStayNotice", { nights: minStay }) : t("noRooms")}
            </p>
          ) : (
            <div className="mt-6 grid gap-6">
              {displayRooms.map((room, idx) => {
                const copy = room.roomId ? roomCopyById[room.roomId] : undefined;
                const label = copy?.name ?? `Room ${room.beds24RoomId}`;
                return (
                  <div
                    key={room.beds24RoomId}
                    className="bg-brand-cream grid overflow-hidden rounded-2xl ring-1 ring-black/5 md:grid-cols-[280px_1fr]"
                  >
                    <div className="relative aspect-[4/3] md:aspect-auto md:h-full">
                      <Image
                        src="/images/room.jpeg"
                        alt={label}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 280px"
                      />
                    </div>

                    <div className="flex flex-col gap-4 p-6 md:p-8">
                      <div>
                        <p className="text-brand-ink-soft text-[11px] font-semibold tracking-[0.15em] uppercase">
                          {tRooms("label")} · #{idx + 1}
                        </p>
                        <h3 className="text-brand-ink mt-1.5 font-serif text-2xl font-semibold">
                          {label}
                        </h3>
                      </div>

                      {copy && (
                        <div className="text-brand-ink-soft flex flex-wrap gap-x-5 gap-y-2 text-xs">
                          <span className="inline-flex items-center gap-1.5">
                            <BedDouble className="text-brand-teal size-4" />
                            {copy.beds}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Users className="text-brand-teal size-4" />
                            {copy.maxGuests} {tRooms("guests")}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Eye className="text-brand-teal size-4" />
                            {copy.view}
                          </span>
                        </div>
                      )}

                      {copy && (
                        <p className="text-brand-ink-soft text-sm leading-6">{copy.description}</p>
                      )}

                      <ul className="grid gap-2 sm:grid-cols-2">
                        {amenities.map(({ icon: Icon, label: amen }) => (
                          <li
                            key={amen}
                            className="text-brand-ink flex items-start gap-2 text-xs leading-5"
                          >
                            <Icon className="text-brand-teal mt-0.5 size-4 shrink-0" />
                            <span>{amen}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-2 flex flex-col items-start justify-between gap-3 border-t border-black/5 pt-5 sm:flex-row sm:items-center">
                        {room.totalPrice !== null && (
                          <div>
                            <p className="text-brand-ink-soft text-[11px] tracking-wider uppercase">
                              {t("totalFor", { nights: room.nights })}
                            </p>
                            <p className="text-brand-ink mt-0.5 font-serif text-2xl font-semibold">
                              {room.totalPrice.toLocaleString()}{" "}
                              <span className="text-brand-ink-soft text-sm font-normal">
                                {room.currency}
                              </span>
                            </p>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setSelected(room);
                            setStep("guest");
                          }}
                          className="btn-pill-primary"
                        >
                          {t("select")}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {step === "guest" && criteria && selected && (
        <form onSubmit={guest.handleSubmit(onGuestSubmit)}>
          <button
            type="button"
            onClick={() => setStep("results")}
            className="text-brand-ink-soft hover:text-brand-pink mb-6 inline-flex items-center gap-2 text-sm"
          >
            <ArrowLeft className="size-4" />
            {t("back")}
          </button>

          <div className="bg-brand-blush rounded-xl p-5">
            <p className="section-label">{t("summary")}</p>
            <p className="text-brand-ink mt-2 font-serif text-lg">
              {(selected.roomId && roomCopyById[selected.roomId]?.name) ??
                `Room ${selected.beds24RoomId}`}
            </p>
            <p className="text-brand-ink-soft mt-1 text-sm">
              {criteria.checkIn} → {criteria.checkOut} · {criteria.adults + criteria.children}{" "}
              {t("adults")}
              {selected.totalPrice !== null && (
                <>
                  {" · "}
                  <span className="text-brand-teal font-semibold">
                    {selected.totalPrice.toLocaleString()} {selected.currency}
                  </span>
                </>
              )}
            </p>
          </div>

          <h3 className="text-brand-ink mt-8 font-serif text-2xl font-semibold">
            {t("guestTitle")}
          </h3>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="name">
                {t("name")}
              </label>
              <input
                id="name"
                {...guest.register("name")}
                className={cn(inputClass, guest.formState.errors.name && "border-red-400")}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="email">
                {t("email")}
              </label>
              <input
                id="email"
                type="email"
                {...guest.register("email")}
                className={cn(inputClass, guest.formState.errors.email && "border-red-400")}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="phone">
                {t("phone")}
              </label>
              <input
                id="phone"
                {...guest.register("phone")}
                className={cn(inputClass, guest.formState.errors.phone && "border-red-400")}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="notes">
                {t("notes")}
              </label>
              <textarea id="notes" rows={3} {...guest.register("notes")} className={inputClass} />
            </div>
          </div>

          <button
            type="submit"
            disabled={guest.formState.isSubmitting}
            className="btn-pill-primary mt-6 w-full disabled:opacity-60 sm:w-auto"
          >
            {guest.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {t("confirming")}
              </>
            ) : (
              t("confirm")
            )}
          </button>
        </form>
      )}

      {step === "payment" && criteria && selected && payment && (
        <PaymentStep
          payment={payment}
          summary={{
            roomLabel:
              (selected.roomId && roomCopyById[selected.roomId]?.name) ??
              `Room ${selected.beds24RoomId}`,
            checkIn: criteria.checkIn,
            checkOut: criteria.checkOut,
            guests: criteria.adults + criteria.children,
          }}
          onBack={() => setStep("guest")}
          onAuthorized={onPaymentAuthorized}
        />
      )}
    </div>
  );
}

interface PaymentStepProps {
  payment: PaymentSession;
  summary: { roomLabel: string; checkIn: string; checkOut: string; guests: number };
  onBack: () => void;
  onAuthorized: () => Promise<void>;
}

function PaymentStep({
  payment,
  summary,
  onBack,
  onAuthorized,
}: PaymentStepProps): React.JSX.Element {
  const t = useTranslations("booking");
  const stripeP = useMemo(() => getStripe(), []);
  const [acknowledged, setAcknowledged] = useState(false);

  if (!PUBLISHABLE_KEY) {
    return (
      <div className="bg-brand-blush rounded-xl p-5 text-sm text-red-600">
        Stripe publishable key is not configured.
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="text-brand-ink-soft hover:text-brand-pink mb-6 inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="size-4" />
        {t("back")}
      </button>

      <div className="bg-brand-blush rounded-xl p-5">
        <p className="section-label">{t("summary")}</p>
        <p className="text-brand-ink mt-2 font-serif text-lg">{summary.roomLabel}</p>
        <p className="text-brand-ink-soft mt-1 text-sm">
          {summary.checkIn} → {summary.checkOut} · {summary.guests} {t("adults")}
        </p>
        <div className="mt-4 grid gap-1.5 border-t border-black/5 pt-4 text-sm">
          <div className="text-brand-ink-soft flex justify-between">
            <span>{t("totalStayLabel")}</span>
            <span>{payment.totalAmount.toLocaleString()} THB</span>
          </div>
          <div className="text-brand-teal flex justify-between font-semibold">
            <span>{t("depositLabel", { percent: payment.depositPercent })}</span>
            <span>{payment.depositAmount.toLocaleString()} THB</span>
          </div>
          {payment.balanceDue > 0 && (
            <div className="text-brand-ink-soft flex justify-between">
              <span>{t("balanceDueLabel")}</span>
              <span>{payment.balanceDue.toLocaleString()} THB</span>
            </div>
          )}
        </div>
      </div>

      <h3 className="text-brand-ink mt-8 font-serif text-2xl font-semibold">{t("paymentTitle")}</h3>
      <p className="text-brand-ink-soft mt-2 text-sm">
        {t("paymentSubtitle", { percent: payment.depositPercent })}
      </p>

      <div className="bg-brand-blush text-brand-ink mt-5 rounded-xl p-4 text-xs leading-5">
        {t("nonRefundableNotice")}
      </div>

      <label className="mt-4 flex items-start gap-2.5 text-sm">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
          className="accent-brand-pink mt-0.5 size-4 shrink-0 cursor-pointer"
        />
        <span className="text-brand-ink">{t("acknowledgeNonRefundable")}</span>
      </label>

      <div className="mt-6">
        <Elements
          stripe={stripeP}
          options={{
            clientSecret: payment.clientSecret,
            appearance: {
              theme: "flat",
              variables: {
                colorPrimary: "#b5532a",
                colorText: "#5a7c55",
                colorBackground: "#ffffff",
                fontFamily: "Raleway, system-ui, sans-serif",
                borderRadius: "12px",
                spacingUnit: "4px",
              },
            },
          }}
        >
          <PaymentInner
            amount={payment.depositAmount}
            acknowledged={acknowledged}
            onAuthorized={onAuthorized}
          />
        </Elements>
      </div>

      <p className="text-brand-ink-soft mt-4 inline-flex items-center gap-1.5 text-xs">
        <Lock className="size-3.5" />
        {t("paySecureNotice")}
      </p>
    </div>
  );
}

interface PaymentInnerProps {
  amount: number;
  acknowledged: boolean;
  onAuthorized: () => Promise<void>;
}

function PaymentInner({
  amount,
  acknowledged,
  onAuthorized,
}: PaymentInnerProps): React.JSX.Element {
  const t = useTranslations("booking");
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Whether Apple Pay / Google Pay / Link are actually available on this
  // device — set by ExpressCheckoutElement's onReady. Used to hide the
  // "or pay with card" separator when there's nothing above it.
  const [walletsAvailable, setWalletsAvailable] = useState(false);

  async function confirmAndAuthorize(): Promise<void> {
    if (!stripe || !elements) return;
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });
    if (error) {
      setErrorMsg(error.message ?? t("payError"));
      setSubmitting(false);
      return;
    }
    // With manual capture, a successful authorization lands in
    // `requires_capture` (not `succeeded`) — capture happens server-side
    // after Beds24 confirms the reservation.
    if (paymentIntent && paymentIntent.status !== "requires_capture") {
      setErrorMsg(t("payError"));
      setSubmitting(false);
      return;
    }
    await onAuthorized();
  }

  async function handleCardPay(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await confirmAndAuthorize();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t("payError"));
      setSubmitting(false);
    }
  }

  async function handleWalletConfirm(): Promise<void> {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await confirmAndAuthorize();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t("payError"));
      setSubmitting(false);
    }
  }

  return (
    <div>
      <ExpressCheckoutElement
        options={{
          buttonHeight: 48,
          buttonTheme: { applePay: "black", googlePay: "black" },
          paymentMethods: { applePay: "auto", googlePay: "auto", link: "never" },
          buttonType: { applePay: "buy", googlePay: "buy" },
        }}
        onReady={(event: StripeExpressCheckoutElementReadyEvent) => {
          const methods = event.availablePaymentMethods;
          setWalletsAvailable(Boolean(methods?.applePay || methods?.googlePay || methods?.link));
        }}
        onClick={({ resolve }) => {
          if (!acknowledged) {
            // Don't open the wallet sheet — show the same error message
            // the card button would gate on. resolve() is intentionally
            // not called.
            setErrorMsg(t("acknowledgeRequired"));
            return;
          }
          setErrorMsg(null);
          resolve();
        }}
        onConfirm={handleWalletConfirm}
      />

      {walletsAvailable && (
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-black/10" />
          <span className="text-brand-ink-soft text-[10px] tracking-[0.2em] uppercase">
            {t("orPayWithCard")}
          </span>
          <div className="h-px flex-1 bg-black/10" />
        </div>
      )}

      <form onSubmit={handleCardPay}>
        <PaymentElement />
        {errorMsg && <p className="mt-3 text-sm text-red-600">{errorMsg}</p>}
        <button
          type="submit"
          disabled={!stripe || !elements || submitting || !acknowledged}
          className="btn-pill-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {t("payProcessing")}
            </>
          ) : (
            t("payNow", { amount: amount.toLocaleString() })
          )}
        </button>
      </form>
    </div>
  );
}

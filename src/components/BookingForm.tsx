"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, BedDouble, Loader2, Lock } from "lucide-react";
import { loadStripe, type Stripe as StripeJs } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { cn } from "@/lib/utils";
import { ROOMS, type Room } from "@/config/rooms";

// TODO: pnpm add @stripe/react-stripe-js @stripe/stripe-js (already present — verify in package.json)

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const SearchSchema = z
  .object({
    roomId: z.string().min(1),
    checkIn: z.string().regex(ISO_DATE),
    checkOut: z.string().regex(ISO_DATE),
    guests: z.coerce.number().int().min(1).max(10),
  })
  .refine((d) => d.checkOut > d.checkIn, {
    message: "Check-out must be after check-in",
    path: ["checkOut"],
  });

type SearchValues = z.input<typeof SearchSchema>;
type SearchInput = z.output<typeof SearchSchema>;

const GuestSchema = z.object({
  guestName: z.string().min(2),
  guestEmail: z.string().email(),
  guestPhone: z.string().min(6),
  notes: z.string().optional(),
});

type GuestInput = z.infer<typeof GuestSchema>;

type Step = "search" | "guest" | "payment" | "success" | "error";

const inputClass =
  "focus:border-brand-pink w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm transition-colors outline-none";

const labelClass = "text-brand-ink mb-1.5 block text-xs font-semibold tracking-wider uppercase";

interface PaymentSession {
  clientSecret: string;
  bookingId: number | null;
  totalThb: number;
}

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
let stripePromise: Promise<StripeJs | null> | null = null;
function getStripe(): Promise<StripeJs | null> {
  if (!PUBLISHABLE_KEY) return Promise.resolve(null);
  if (!stripePromise) stripePromise = loadStripe(PUBLISHABLE_KEY);
  return stripePromise;
}

export default function BookingForm(): React.JSX.Element {
  const t = useTranslations("booking");
  const locale = useLocale();

  const [step, setStep] = useState<Step>("search");
  const [searchData, setSearchData] = useState<SearchInput | null>(null);
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const [guestData, setGuestData] = useState<GuestInput | null>(null);
  const [payment, setPayment] = useState<PaymentSession | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const [mounted, setMounted] = useState(false);
  const [today, setToday] = useState<string>("");
  useEffect(() => {
    setMounted(true);
    setToday(new Date().toISOString().slice(0, 10));
  }, []);

  const search = useForm<SearchValues, unknown, SearchInput>({
    resolver: zodResolver(SearchSchema),
    defaultValues: { guests: 2, roomId: ROOMS[0]?.id ?? "" },
  });

  const guest = useForm<GuestInput>({
    resolver: zodResolver(GuestSchema),
  });

  const watchedRoomId = search.watch("roomId");
  const watchRoom = ROOMS.find((r) => r.id === watchedRoomId);

  const nights = useMemo(() => {
    if (!searchData) return 0;
    const ms =
      new Date(`${searchData.checkOut}T00:00:00Z`).getTime() -
      new Date(`${searchData.checkIn}T00:00:00Z`).getTime();
    return Math.round(ms / 86_400_000);
  }, [searchData]);

  async function fetchUnavailable(roomId: string): Promise<void> {
    try {
      const res = await fetch(`/api/availability?room=${encodeURIComponent(roomId)}`);
      if (!res.ok) return;
      const json = (await res.json()) as { unavailable: string[] };
      setUnavailable(json.unavailable ?? []);
    } catch {
      setUnavailable([]);
    }
  }

  async function onSearch(data: SearchInput): Promise<void> {
    const room = ROOMS.find((r) => r.id === data.roomId);
    if (!room) {
      setErrorDetail("Unknown room selected");
      setStep("error");
      return;
    }

    if (unavailable.includes(data.checkIn) || unavailable.includes(data.checkOut)) {
      setErrorDetail(t("noRooms"));
      setStep("error");
      return;
    }

    setSearchData(data);
    setSelectedRoom(room);
    setStep("guest");
  }

  async function onGuestSubmit(data: GuestInput): Promise<void> {
    if (!searchData || !selectedRoom) return;
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: searchData.roomId,
          checkIn: searchData.checkIn,
          checkOut: searchData.checkOut,
          guests: searchData.guests,
          guestName: data.guestName,
          guestEmail: data.guestEmail,
          guestPhone: data.guestPhone,
          notes: data.notes,
          locale,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const json = (await res.json()) as PaymentSession;
      setGuestData(data);
      setPayment(json);
      setStep("payment");
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
          {t("successDetail", { id: payment?.bookingId ?? "—" })}
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
        <form onSubmit={search.handleSubmit(onSearch)} className="grid gap-5">
          <div>
            <label className={labelClass} htmlFor="roomId">
              {t("roomLabel")}
            </label>
            <select
              id="roomId"
              {...search.register("roomId", {
                onChange: (e) => fetchUnavailable(e.target.value),
              })}
              className={cn(inputClass, search.formState.errors.roomId && "border-red-400")}
            >
              {ROOMS.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.id} — {room.priceThb.toLocaleString()} THB / night
                </option>
              ))}
            </select>
            {watchRoom && (
              <p className="text-brand-ink-soft mt-1 text-xs">Max {watchRoom.maxGuests} guests</p>
            )}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
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
            <div>
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
          </div>

          <div className="md:w-1/4">
            <label className={labelClass} htmlFor="guests">
              {t("adults")}
            </label>
            <input
              id="guests"
              type="number"
              min={1}
              max={watchRoom?.maxGuests ?? 10}
              {...search.register("guests")}
              className={inputClass}
            />
          </div>

          <div>
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

      {step === "guest" && searchData && selectedRoom && (
        <form onSubmit={guest.handleSubmit(onGuestSubmit)}>
          <button
            type="button"
            onClick={() => setStep("search")}
            className="text-brand-ink-soft hover:text-brand-pink mb-6 inline-flex items-center gap-2 text-sm"
          >
            <ArrowLeft className="size-4" />
            {t("back")}
          </button>

          <div className="bg-brand-blush rounded-xl p-5">
            <p className="section-label">{t("summary")}</p>
            <p className="text-brand-ink mt-2 font-serif text-lg">{selectedRoom.id}</p>
            <p className="text-brand-ink-soft mt-1 text-sm">
              {searchData.checkIn} → {searchData.checkOut} · {searchData.guests} {t("adults")}
              {" · "}
              <span className="text-brand-teal font-semibold">
                {(selectedRoom.priceThb * nights).toLocaleString()} THB
              </span>
            </p>
          </div>

          <h3 className="text-brand-ink mt-8 font-serif text-2xl font-semibold">
            {t("guestTitle")}
          </h3>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="guestName">
                {t("name")}
              </label>
              <input
                id="guestName"
                {...guest.register("guestName")}
                className={cn(inputClass, guest.formState.errors.guestName && "border-red-400")}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="guestEmail">
                {t("email")}
              </label>
              <input
                id="guestEmail"
                type="email"
                {...guest.register("guestEmail")}
                className={cn(inputClass, guest.formState.errors.guestEmail && "border-red-400")}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="guestPhone">
                {t("phone")}
              </label>
              <input
                id="guestPhone"
                {...guest.register("guestPhone")}
                className={cn(inputClass, guest.formState.errors.guestPhone && "border-red-400")}
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

      {step === "payment" && searchData && selectedRoom && payment && guestData && (
        <PaymentStep
          payment={payment}
          summary={{
            roomLabel: selectedRoom.id,
            checkIn: searchData.checkIn,
            checkOut: searchData.checkOut,
            guests: searchData.guests,
            totalThb: payment.totalThb,
          }}
          onBack={() => setStep("guest")}
          onSuccess={() => setStep("success")}
          onError={(msg) => {
            setErrorDetail(msg);
            setStep("error");
          }}
        />
      )}
    </div>
  );
}

interface PaymentStepProps {
  payment: PaymentSession;
  summary: {
    roomLabel: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    totalThb: number;
  };
  onBack: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
}

function PaymentStep({
  payment,
  summary,
  onBack,
  onSuccess,
  onError,
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
          <div className="text-brand-teal flex justify-between font-semibold">
            <span>{t("depositLabel", { percent: 100 })}</span>
            <span>{summary.totalThb.toLocaleString()} THB</span>
          </div>
        </div>
      </div>

      <h3 className="text-brand-ink mt-8 font-serif text-2xl font-semibold">{t("paymentTitle")}</h3>

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
            amount={summary.totalThb}
            acknowledged={acknowledged}
            onSuccess={onSuccess}
            onError={onError}
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
  onSuccess: () => void;
  onError: (msg: string) => void;
}

function PaymentInner({
  amount,
  acknowledged,
  onSuccess,
  onError,
}: PaymentInnerProps): React.JSX.Element {
  const t = useTranslations("booking");
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  async function handleCardPay(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!stripe || !elements || !ready) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      // Required when clientSecret is set on the Elements provider
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setErrorMsg(submitError.message ?? t("payError"));
        setSubmitting(false);
        return;
      }
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });
      if (error) {
        setErrorMsg(error.message ?? t("payError"));
        setSubmitting(false);
        return;
      }
      if (paymentIntent && paymentIntent.status === "succeeded") {
        onSuccess();
        return;
      }
      setErrorMsg(t("payError"));
      setSubmitting(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t("payError"));
      setSubmitting(false);
      onError(err instanceof Error ? err.message : t("payError"));
    }
  }

  return (
    <form onSubmit={handleCardPay}>
      <PaymentElement onReady={() => setReady(true)} />
      {errorMsg && <p className="mt-3 text-sm text-red-600">{errorMsg}</p>}
      <button
        type="submit"
        disabled={!stripe || !elements || submitting || !acknowledged || !ready}
        className="btn-pill-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {submitting || !ready ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            {submitting ? t("payProcessing") : t("payNow", { amount: amount.toLocaleString() })}
          </>
        ) : (
          t("payNow", { amount: amount.toLocaleString() })
        )}
      </button>
    </form>
  );
}

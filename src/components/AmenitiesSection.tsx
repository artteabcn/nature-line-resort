"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Waves,
  Wifi,
  Wind,
  Coffee,
  MessageCircle,
  Car,
  Sparkles,
  Languages,
  X,
  ChevronRight,
  Loader2,
  ConciergeBell,
  SquareParking,
  Utensils,
  Wine,
  Dumbbell,
  Bath,
  Umbrella,
  Trees,
  Tv,
  PawPrint,
  Baby,
  Bike,
} from "lucide-react";
import type { PaidService } from "@/db/schema";

// Keys must stay in sync with FACILITY_ICONS in src/lib/facility-icons.ts.
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  pool: Waves,
  wifi: Wifi,
  ac: Wind,
  breakfast: Coffee,
  whatsapp: MessageCircle,
  transfer: Car,
  cleaning: Sparkles,
  languages: Languages,
  parking: SquareParking,
  restaurant: Utensils,
  bar: Wine,
  gym: Dumbbell,
  spa: Bath,
  beach: Umbrella,
  garden: Trees,
  tv: Tv,
  pets: PawPrint,
  family: Baby,
  bicycle: Bike,
  concierge: ConciergeBell,
};

interface AmenityItem {
  icon: string;
  title: string;
  desc: string;
}

function ServicesModal({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [services, setServices] = useState<PaidService[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  React.useEffect(() => {
    fetch("/api/paid-services")
      .then((r) => r.json() as Promise<{ services?: PaidService[] }>)
      .then((data) => setServices(data.services ?? []))
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return (): void => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-black/5 px-6 py-4">
          <h2 className="text-brand-ink font-serif text-xl font-semibold">
            Paid Services &amp; Prices
          </h2>
          <button
            onClick={onClose}
            className="text-brand-ink-soft hover:text-brand-ink rounded-lg p-1.5 transition-colors"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="text-brand-pink size-6 animate-spin" />
            </div>
          )}

          {fetchError && (
            <p className="py-8 text-center text-sm text-gray-500">
              Unable to load services. Please try again later.
            </p>
          )}

          {!loading && !fetchError && services?.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-500">
              No paid services configured yet. Contact us via WhatsApp for pricing.
            </p>
          )}

          {!loading && !fetchError && services && services.length > 0 && (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-black/5">
                {services.map((s) => (
                  <tr key={s.id}>
                    <td className="py-4 pr-4">
                      <p className="text-brand-ink font-semibold">{s.name}</p>
                      {s.description && (
                        <p className="text-brand-ink-soft mt-0.5 text-xs">{s.description}</p>
                      )}
                    </td>
                    <td className="py-4 text-right whitespace-nowrap">
                      <span className="text-brand-ink font-semibold">
                        {s.price.toLocaleString()} {s.currency}
                      </span>
                      {s.unit && (
                        <span className="text-brand-ink-soft ml-1 text-xs">/ {s.unit}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="border-t border-black/5 px-6 py-4">
          <p className="text-brand-ink-soft text-xs">
            All prices in THB. Contact us via WhatsApp to arrange any service.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AmenitiesSection(): React.JSX.Element {
  const t = useTranslations("amenities");
  const items = t.raw("items") as AmenityItem[];
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <section id="amenities" className="bg-brand-blush py-20">
      <div className="mx-auto max-w-7xl px-8">
        <div className="text-center">
          <p className="section-label">{t("label")}</p>
          <h2 className="section-title mt-3">{t("title")}</h2>
          <p className="section-subtitle mx-auto">{t("subtitle")}</p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => {
            const Icon = ICON_MAP[item.icon] ?? Sparkles;
            return (
              <div
                key={item.icon}
                className="group flex items-start gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 transition-shadow duration-300 hover:shadow-md"
              >
                <div className="bg-brand-teal-light text-brand-teal-dark group-hover:bg-brand-teal mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full transition-colors group-hover:text-white">
                  <Icon className="size-4" />
                </div>
                <div>
                  <h3 className="text-brand-charcoal font-serif text-sm font-semibold">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-gray-500">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="group ring-brand-pink/25 hover:ring-brand-pink/50 mt-6 flex w-full items-center justify-between rounded-2xl bg-white px-7 py-5 shadow-sm ring-1 transition-all hover:shadow-md"
        >
          <div className="flex items-center gap-4">
            <div className="bg-brand-pink-light text-brand-pink flex size-10 shrink-0 items-center justify-center rounded-full">
              <ConciergeBell className="size-5" />
            </div>
            <span className="text-brand-ink font-semibold">{t("servicesLink")}</span>
          </div>
          <ChevronRight className="text-brand-pink size-5 shrink-0 transition-transform group-hover:translate-x-1" />
        </button>
      </div>

      {modalOpen && <ServicesModal onClose={() => setModalOpen(false)} />}
    </section>
  );
}

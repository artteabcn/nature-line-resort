import React from "react";
import Image from "next/image";
import { getTranslations, getLocale } from "next-intl/server";
import { BedDouble, Users, Eye } from "lucide-react";
import { getImageUrl } from "@/lib/content";

interface RoomItem {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  maxGuests: number;
  beds: string;
  view: string;
}

export default async function RoomsSection(): Promise<React.JSX.Element> {
  const t = await getTranslations("rooms");
  const locale = await getLocale();
  const rooms = t.raw("items") as RoomItem[];

  // Per-category cover image, falling back to the shared room photo until the
  // owner uploads a distinct image per category via the /content CMS.
  const roomImages = await Promise.all(
    rooms.map((room) => getImageUrl(`rooms.${room.id}.cover`, "/images/room.jpeg"))
  );

  return (
    <section id="rooms" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-8">
        <div className="text-center">
          <p className="section-label">{t("label")}</p>
          <h2 className="section-title mt-3">{t("title")}</h2>
          <p className="section-subtitle mx-auto">{t("subtitle")}</p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room, idx) => (
            <article
              key={room.id}
              className="bg-brand-cream flex flex-col overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/5"
            >
              <div className="relative aspect-[4/3]">
                <Image
                  src={roomImages[idx]}
                  alt={room.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  unoptimized
                />
              </div>

              <div className="flex flex-1 flex-col p-7">
                <h3 className="text-brand-ink font-serif text-2xl font-semibold">{room.name}</h3>

                <div className="text-brand-ink-soft mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs">
                  <span className="inline-flex items-center gap-1.5">
                    <BedDouble className="text-brand-teal size-4" />
                    {room.beds}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="text-brand-teal size-4" />
                    {room.maxGuests} {t("guests")}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Eye className="text-brand-teal size-4" />
                    {room.view}
                  </span>
                </div>

                <p className="text-brand-ink-soft mt-4 text-sm leading-6">{room.description}</p>

                <div className="mt-6 flex items-center justify-between border-t border-gray-200/70 pt-5">
                  <div>
                    <span className="text-brand-ink-soft text-[11px] tracking-wider uppercase">
                      {t("from")}
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-brand-ink font-serif text-2xl font-semibold">
                        {room.price.toLocaleString()}
                      </span>
                      <span className="text-brand-ink-soft text-xs">
                        {room.currency} {t("perNight")}
                      </span>
                    </div>
                  </div>
                  <a href={`/${locale}/book`} className="btn-pill-primary">
                    {t("cta")}
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

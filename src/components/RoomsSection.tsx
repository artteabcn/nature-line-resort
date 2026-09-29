import React from "react";
import Image from "next/image";
import { getTranslations, getLocale } from "next-intl/server";
import { ArrowUpRight, BedDouble, Users, Eye } from "lucide-react";
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

  // One honest feature photo (the first room's CMS cover) instead of three
  // cards repeating the same picture. Owners can upload per-room covers via
  // /content; the first one leads this section.
  const featureSrc = await getImageUrl(
    `rooms.${rooms[0]?.id ?? "cosy"}.cover`,
    "/images/room.jpeg"
  );
  const numberFmt = new Intl.NumberFormat(locale);

  return (
    <section id="rooms" className="bg-brand-blush/60 py-24 md:py-36">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div className="reveal-up grid gap-6 md:grid-cols-12 md:items-end">
          <div className="md:col-span-7">
            <p className="section-label">{t("label")}</p>
            <h2 className="section-title mt-5">{t("title")}</h2>
          </div>
          <p className="section-subtitle md:col-span-5 md:mt-0">{t("subtitle")}</p>
        </div>

        <div className="mt-16 grid gap-12 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-5">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.25rem] shadow-[0_30px_60px_-30px_rgba(28,42,36,0.45)] lg:sticky lg:top-28">
              <Image
                src={featureSrc}
                alt={rooms[0]?.name ?? t("title")}
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="parallax-media object-cover"
                unoptimized
              />
            </div>
          </div>

          <ol className="divide-brand-ink/10 border-brand-ink/10 divide-y border-y lg:col-span-7">
            {rooms.map((room, idx) => (
              <li key={room.id} className="reveal-up">
                <a
                  href={`/${locale}/book`}
                  className="group grid grid-cols-[auto_1fr] gap-x-6 gap-y-4 py-9 md:grid-cols-[auto_1fr_auto] md:gap-x-10"
                >
                  <span className="text-brand-teal pt-2 font-serif text-sm tabular-nums">
                    {String(idx + 1).padStart(2, "0")}
                  </span>

                  <div>
                    <h3 className="text-brand-ink text-3xl font-normal tracking-tight md:text-4xl">
                      {room.name}
                    </h3>
                    <div className="text-brand-ink-soft mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs">
                      <span className="inline-flex items-center gap-1.5">
                        <BedDouble className="text-brand-teal size-4" aria-hidden />
                        {room.beds}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="text-brand-teal size-4" aria-hidden />
                        {room.maxGuests} {t("guests")}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Eye className="text-brand-teal size-4" aria-hidden />
                        {room.view}
                      </span>
                    </div>
                    <p className="text-brand-ink-soft mt-4 max-w-lg text-sm leading-7">
                      {room.description}
                    </p>
                  </div>

                  <div className="col-start-2 flex items-center justify-between gap-6 md:col-start-3 md:flex-col md:items-end md:justify-start">
                    <div className="md:text-right">
                      <span className="text-brand-ink-soft text-[10px] font-semibold tracking-[0.18em] uppercase">
                        {t("from")}
                      </span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-brand-ink font-serif text-3xl font-light tabular-nums">
                          {numberFmt.format(room.price)}
                        </span>
                        <span className="text-brand-ink-soft text-xs">
                          {room.currency} {t("perNight")}
                        </span>
                      </div>
                    </div>
                    <span className="border-brand-pink/25 text-brand-pink group-hover:bg-brand-pink flex size-12 shrink-0 items-center justify-center rounded-full border transition-[background-color,color,transform] duration-200 ease-out group-hover:text-white group-active:scale-95">
                      <ArrowUpRight className="size-5" aria-hidden />
                      <span className="sr-only">{t("cta")}</span>
                    </span>
                  </div>
                </a>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

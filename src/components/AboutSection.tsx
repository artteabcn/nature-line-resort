import React from "react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { getImageUrl } from "@/lib/content";

export default async function AboutSection(): Promise<React.JSX.Element> {
  const t = await getTranslations("about");
  const [mainSrc, detailSrc] = await Promise.all([
    getImageUrl("about.main", "/images/main3.jpeg"),
    getImageUrl("gallery.1", "/images/main2.jpeg"),
  ]);

  const stats = [
    { value: t("stat1Value"), label: t("stat1Label") },
    { value: t("stat2Value"), label: t("stat2Label") },
    { value: t("stat3Value"), label: t("stat3Label") },
  ];

  return (
    <section id="about" className="bg-brand-cream overflow-hidden py-24 md:py-36">
      <div className="mx-auto grid max-w-7xl gap-16 px-6 sm:px-8 lg:grid-cols-12 lg:items-center lg:gap-10">
        {/* Layered images — two planes moving at different speeds */}
        <div className="relative lg:col-span-6">
          <div className="relative aspect-[4/5] w-[86%] overflow-hidden rounded-[1.25rem] shadow-[0_30px_60px_-30px_rgba(28,42,36,0.45)]">
            <Image
              src={mainSrc}
              alt={t("imageAlt")}
              fill
              sizes="(max-width: 1024px) 86vw, 44vw"
              className="parallax-media object-cover"
              unoptimized
            />
          </div>
          <div className="parallax-float border-brand-cream absolute right-0 -bottom-10 aspect-[4/3] w-[52%] overflow-hidden rounded-[1rem] border-[6px] shadow-[0_24px_48px_-24px_rgba(28,42,36,0.5)]">
            <Image
              src={detailSrc}
              alt={t("detailAlt")}
              fill
              sizes="(max-width: 1024px) 52vw, 26vw"
              className="object-cover"
              unoptimized
            />
          </div>
        </div>

        <div className="reveal-up lg:col-span-5 lg:col-start-8">
          <p className="section-label">{t("label")}</p>
          <h2 className="section-title mt-5">{t("title")}</h2>
          <p className="text-brand-ink-soft mt-8 text-base leading-8 md:text-[17px]">{t("p1")}</p>
          <p className="text-brand-ink-soft mt-4 text-base leading-8 md:text-[17px]">{t("p2")}</p>

          <dl className="border-brand-ink/10 mt-12 grid grid-cols-3 gap-6 border-t pt-8">
            {stats.map(({ value, label }) => (
              <div key={label}>
                <dt className="sr-only">{label}</dt>
                <dd className="text-brand-ink font-serif text-4xl font-light tracking-tight md:text-5xl">
                  {value}
                </dd>
                <dd className="text-brand-ink-soft mt-2 text-[10px] leading-snug font-semibold tracking-[0.16em] uppercase">
                  {label}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

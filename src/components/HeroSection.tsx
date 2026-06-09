import React from "react";
import Image from "next/image";
import { getTranslations, getLocale } from "next-intl/server";
import { getImageUrl } from "@/lib/content";

export default async function HeroSection(): Promise<React.JSX.Element> {
  const t = await getTranslations("hero");
  const locale = await getLocale();
  const heroSrc = await getImageUrl("hero.main", "/images/main.jpeg");

  return (
    <section className="relative flex h-screen min-h-[640px] items-center justify-center overflow-hidden">
      <Image
        src={heroSrc}
        alt="Nature Line Resort — pool with tropical view"
        fill
        priority
        className="object-cover"
        sizes="100vw"
        unoptimized
      />

      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/75" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,0,0,0.35)_0%,_rgba(0,0,0,0)_70%)]" />

      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.55)]">
        <p className="mb-6 text-[10px] font-semibold tracking-[0.4em] text-white uppercase">
          Khanom · Nakhon Si Thammarat · Thailand
        </p>
        <h1 className="hero-title">{t("tagline")}</h1>
        <p className="mx-auto mt-7 max-w-xl text-base leading-relaxed text-white md:text-lg">
          {t("subheadline")}
        </p>
        <div className="mt-10">
          <a href={`/${locale}/book`} className="btn-pill-light">
            {t("cta")}
          </a>
        </div>
      </div>

      <div className="absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3">
        <span className="text-[9px] tracking-[0.3em] text-white/80 uppercase">Scroll</span>
        <div className="h-12 w-px animate-pulse bg-white/60" />
      </div>
    </section>
  );
}

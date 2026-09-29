import React from "react";
import { getTranslations, getLocale } from "next-intl/server";
import { ArrowDown, ArrowRight } from "lucide-react";
import HeroVideo from "./HeroVideo";

export default async function HeroSection(): Promise<React.JSX.Element> {
  const t = await getTranslations("hero");
  const locale = await getLocale();

  return (
    <section className="bg-brand-charcoal relative isolate h-[100svh] min-h-[640px] overflow-hidden">
      {/* Media layer — sinks slower than the page on scroll (parallax) */}
      <div className="hero-parallax-media absolute inset-0 -z-10 will-change-transform">
        <HeroVideo poster="/video/hero-poster.jpg" label={t("videoLabel")} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/10 to-black/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/10 to-transparent" />
      </div>

      <div className="hero-parallax-copy mx-auto flex h-full max-w-7xl flex-col justify-end px-6 pb-28 sm:px-8 md:pb-32">
        <p
          className="hero-rise mb-6 text-[11px] font-semibold tracking-[0.32em] text-white/85 uppercase"
          style={{ "--i": 0 } as React.CSSProperties}
        >
          {t("location")}
        </p>
        <h1 className="hero-title hero-rise max-w-4xl" style={{ "--i": 1 } as React.CSSProperties}>
          {t("tagline")}
        </h1>
        <p
          className="hero-rise mt-6 max-w-xl text-base leading-relaxed text-white/85 md:text-lg"
          style={{ "--i": 2 } as React.CSSProperties}
        >
          {t("subheadline")}
        </p>
        <div
          className="hero-rise mt-10 flex flex-wrap items-center gap-3"
          style={{ "--i": 3 } as React.CSSProperties}
        >
          <a href={`/${locale}/book`} className="btn-pill-light">
            {t("cta")}
            <ArrowRight className="size-4" aria-hidden />
          </a>
          <a href="#rooms" className="btn-pill-ghost">
            {t("explore")}
          </a>
        </div>
      </div>

      <a
        href="#about"
        aria-label={t("discover")}
        className="absolute right-6 bottom-8 hidden items-center gap-3 text-[10px] font-semibold tracking-[0.3em] text-white/75 uppercase transition-colors duration-200 hover:text-white sm:right-8 md:flex"
      >
        {t("discover")}
        <span className="flex size-9 items-center justify-center rounded-full border border-white/40">
          <ArrowDown className="size-3.5" aria-hidden />
        </span>
      </a>
    </section>
  );
}

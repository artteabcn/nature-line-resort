import React from "react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { getImageUrl } from "@/lib/content";

/** Full-bleed interlude — the aerial view drifting behind a single line of copy. */
export default async function ParallaxBand(): Promise<React.JSX.Element> {
  const t = await getTranslations("band");
  const src = await getImageUrl("band.main", "/images/main.jpeg");

  return (
    <section
      aria-labelledby="band-title"
      className="bg-brand-charcoal relative isolate flex min-h-[78svh] items-center overflow-hidden"
    >
      <Image
        src={src}
        alt=""
        fill
        sizes="100vw"
        className="parallax-media-strong -z-10 object-cover"
        unoptimized
      />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(16,32,26,0.35)_0%,rgba(16,32,26,0.72)_100%)]" />

      <div className="reveal-up mx-auto max-w-4xl px-6 py-28 text-center text-white">
        <p className="text-[11px] font-semibold tracking-[0.32em] text-white/80 uppercase">
          {t("label")}
        </p>
        <h2
          id="band-title"
          className="mt-6 font-serif text-4xl leading-[1.05] font-light tracking-tight text-balance text-white md:text-6xl lg:text-7xl"
        >
          {t("title")}
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/80 md:text-lg">
          {t("text")}
        </p>
      </div>
    </section>
  );
}

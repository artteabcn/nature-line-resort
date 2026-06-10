"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface Slide {
  src: string;
  alt: string;
}

const SLIDES: Slide[] = [
  { src: "/images/main3.jpeg", alt: "Nature Line Resort nestled in the tropical garden" },
  { src: "/images/main2.jpeg", alt: "Outdoor lounge by the pool" },
  { src: "/images/main4.jpeg", alt: "Pink poolside with seating" },
  { src: "/images/room.jpeg", alt: "Bright bedroom with garden access" },
];

const INTERVAL_MS = 5000;

export default function AboutCarousel(): React.JSX.Element {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setActive((a) => (a + 1) % slides.length);
    }, INTERVAL_MS);
    return (): void => window.clearInterval(id);
  }, [paused]);

  return (
    <div
      className="relative mx-auto aspect-[4/3] w-full max-w-lg overflow-hidden rounded-2xl ring-1 ring-black/5 lg:max-w-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Nature Line Resort photos"
    >
      {SLIDES.map((slide, i) => (
        <Image
          key={slide.src}
          src={slide.src}
          alt={slide.alt}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className={cn(
            "object-cover transition-opacity duration-1000 ease-in-out",
            i === active ? "opacity-100" : "opacity-0"
          )}
          priority={i === 0}
        />
      ))}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/45 to-transparent" />

      <div className="absolute right-4 bottom-4 flex items-center gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`Show photo ${i + 1} of ${slides.length}`}
            aria-current={i === active}
            className={cn(
              "h-2 rounded-full bg-white/70 transition-all duration-300 hover:bg-white",
              i === active ? "w-7 bg-white" : "w-2"
            )}
          />
        ))}
      </div>
    </div>
  );
}
